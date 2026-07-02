import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { connect, type ConsumeMessage } from 'amqplib';
import { AlertType } from '@contracts';
import { NotificationService } from '../../application/services/notification.service';
import { RabbitMqClimateAlertConsumerAdapter } from './rabbitmq-climate-alert-consumer.adapter';

jest.mock('amqplib', () => ({
  connect: jest.fn(),
}));

describe('RabbitMqClimateAlertConsumerAdapter', () => {
  const message = {
    messageId: 'message-1',
    occurredAt: '2026-04-25T17:31:00.000Z',
    measurementId: 'measurement-1',
    stationId: 'station-1',
    stationName: 'Central',
    alertType: AlertType.STORM,
    reportedAt: '2026-04-25T17:30:00.000Z',
    temperature: 25,
    humidity: 92,
    pressure: 970,
  };

  const buildConfigService = () =>
    ({
      getOrThrow: jest.fn((key: string) => {
        const values: Record<string, string> = {
          'rabbitmq.url': 'amqp://weatherflow:weatherflow@rabbitmq:5672',
          'rabbitmq.alertExchange': 'weatherflow.alerts',
          'rabbitmq.alertQueue': 'weatherflow.notifications.alerts',
          'rabbitmq.alertRoutingKey': 'alerts.climate.detected',
        };

        return values[key];
      }),
    }) as unknown as ConfigService;

  const buildNotificationService = () =>
    ({
      handleClimateAlert: jest.fn().mockResolvedValue(undefined),
    }) as unknown as jest.Mocked<NotificationService>;

  const buildAmqpMocks = () => {
    const channel = {
      assertExchange: jest.fn().mockResolvedValue({}),
      assertQueue: jest.fn().mockResolvedValue({}),
      bindQueue: jest.fn().mockResolvedValue({}),
      prefetch: jest.fn().mockResolvedValue({}),
      consume: jest.fn().mockResolvedValue({ consumerTag: 'consumer-1' }),
      ack: jest.fn(),
      nack: jest.fn(),
      close: jest.fn().mockResolvedValue(undefined),
    };
    const connection = {
      createChannel: jest.fn().mockResolvedValue(channel),
      close: jest.fn().mockResolvedValue(undefined),
    };

    jest.mocked(connect).mockResolvedValue(connection as never);

    return { channel, connection };
  };

  const buildConsumeMessage = (content: unknown): ConsumeMessage =>
    ({
      content:
        typeof content === 'string'
          ? Buffer.from(content)
          : Buffer.from(JSON.stringify(content)),
      properties: { headers: {} },
    }) as ConsumeMessage;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('connects the notifications queue to the climate alert exchange', async () => {
    const { channel } = buildAmqpMocks();
    const adapter = new RabbitMqClimateAlertConsumerAdapter(
      buildConfigService(),
      buildNotificationService(),
    );

    await adapter.start();

    expect(connect).toHaveBeenCalledWith(
      'amqp://weatherflow:weatherflow@rabbitmq:5672',
    );
    expect(channel.assertExchange).toHaveBeenCalledWith(
      'weatherflow.alerts',
      'topic',
      { durable: true },
    );
    expect(channel.assertQueue).toHaveBeenCalledWith(
      'weatherflow.notifications.alerts',
      { durable: true },
    );
    expect(channel.bindQueue).toHaveBeenCalledWith(
      'weatherflow.notifications.alerts',
      'weatherflow.alerts',
      'alerts.climate.detected',
    );
    expect(channel.prefetch).toHaveBeenCalledWith(1);
    expect(channel.consume).toHaveBeenCalledWith(
      'weatherflow.notifications.alerts',
      expect.any(Function),
      { noAck: false },
    );
  });

  it('delegates valid messages to the application service and acks them', async () => {
    const { channel } = buildAmqpMocks();
    const notificationService = buildNotificationService();
    const adapter = new RabbitMqClimateAlertConsumerAdapter(
      buildConfigService(),
      notificationService,
    );
    const delivery = buildConsumeMessage(message);

    await adapter.start();
    await adapter.handleDelivery(delivery);

    expect(notificationService.handleClimateAlert).toHaveBeenCalledWith(
      message,
    );
    expect(channel.ack).toHaveBeenCalledWith(delivery);
    expect(channel.nack).not.toHaveBeenCalled();
  });

  it('dead-letters malformed messages without invoking the application service', async () => {
    const { channel } = buildAmqpMocks();
    const notificationService = buildNotificationService();
    const adapter = new RabbitMqClimateAlertConsumerAdapter(
      buildConfigService(),
      notificationService,
    );
    const delivery = buildConsumeMessage({
      ...message,
      alertType: AlertType.NONE,
    });

    await adapter.start();
    await adapter.handleDelivery(delivery);

    expect(notificationService.handleClimateAlert).not.toHaveBeenCalled();
    expect(channel.ack).not.toHaveBeenCalled();
    expect(channel.nack).toHaveBeenCalledWith(delivery, false, false);
  });

  it('dead-letters messages when processing fails', async () => {
    const { channel } = buildAmqpMocks();
    const notificationService = buildNotificationService();
    notificationService.handleClimateAlert.mockRejectedValue(
      new Error('notifier failed'),
    );
    const adapter = new RabbitMqClimateAlertConsumerAdapter(
      buildConfigService(),
      notificationService,
    );
    const delivery = buildConsumeMessage(message);

    await adapter.start();
    await adapter.handleDelivery(delivery);

    expect(channel.ack).not.toHaveBeenCalled();
    expect(channel.nack).toHaveBeenCalledWith(delivery, false, false);
  });

  it('closes the channel and connection on module shutdown', async () => {
    const { channel, connection } = buildAmqpMocks();
    const adapter = new RabbitMqClimateAlertConsumerAdapter(
      buildConfigService(),
      buildNotificationService(),
    );

    await adapter.start();
    await adapter.onModuleDestroy();

    expect(channel.close).toHaveBeenCalledTimes(1);
    expect(connection.close).toHaveBeenCalledTimes(1);
  });
});
