import { ConfigService } from '@nestjs/config';
import { connect } from 'amqplib';
import { AlertType } from '@contracts/measurements/alert-type';
import { RabbitMqAlertPublisherAdapter } from './rabbitmq-alert-publisher.adapter';
import type { ClimateAlertDetectedMessage } from '@contracts/measurements/climate-alert-detected.message';

jest.mock('amqplib', () => ({
  connect: jest.fn(),
}));

describe('RabbitMqAlertPublisherAdapter', () => {
  const message: ClimateAlertDetectedMessage = {
    messageId: 'message-1',
    occurredAt: '2026-04-25T17:00:01.000Z',
    measurementId: 'measurement-1',
    stationId: 'station-1',
    stationName: 'Central',
    alertType: AlertType.STORM,
    reportedAt: '2026-04-25T17:00:00.000Z',
    temperature: 24,
    humidity: 92,
    pressure: 970,
    correlationId: 'cycle-1',
  };

  const buildConfigService = () =>
    ({
      getOrThrow: jest.fn((key: string) => {
        const values: Record<string, string> = {
          'rabbitmq.url': 'amqp://weatherflow:weatherflow@rabbitmq:5672',
          'rabbitmq.alertExchange': 'weatherflow.alerts',
          'rabbitmq.alertRoutingKey': 'alerts.climate.detected',
        };

        return values[key];
      }),
    }) as unknown as ConfigService;

  const buildAmqpMocks = () => {
    const channel = {
      assertExchange: jest.fn().mockResolvedValue({}),
      publish: jest.fn().mockReturnValue(true),
      waitForConfirms: jest.fn().mockResolvedValue(undefined),
      close: jest.fn().mockResolvedValue(undefined),
    };
    const connection = {
      createConfirmChannel: jest.fn().mockResolvedValue(channel),
      close: jest.fn().mockResolvedValue(undefined),
    };

    jest.mocked(connect).mockResolvedValue(connection as never);

    return { channel, connection };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('publishes climate alert messages to the configured exchange and routing key', async () => {
    const { channel } = buildAmqpMocks();
    const adapter = new RabbitMqAlertPublisherAdapter(buildConfigService());

    await adapter.publishClimateAlert(message);

    expect(connect).toHaveBeenCalledWith(
      'amqp://weatherflow:weatherflow@rabbitmq:5672',
    );
    expect(channel.assertExchange).toHaveBeenCalledWith(
      'weatherflow.alerts',
      'topic',
      {
        durable: true,
      },
    );
    expect(channel.publish).toHaveBeenCalledWith(
      'weatherflow.alerts',
      'alerts.climate.detected',
      Buffer.from(JSON.stringify(message)),
      {
        contentType: 'application/json',
        deliveryMode: 2,
        messageId: 'message-1',
        timestamp: Math.floor(new Date(message.occurredAt).getTime() / 1000),
        type: 'ClimateAlertDetectedMessage',
        correlationId: 'cycle-1',
      },
    );
    expect(channel.waitForConfirms).toHaveBeenCalledTimes(1);
  });

  it('reuses the RabbitMQ confirm channel across publishes', async () => {
    const { connection } = buildAmqpMocks();
    const adapter = new RabbitMqAlertPublisherAdapter(buildConfigService());

    await adapter.publishClimateAlert(message);
    await adapter.publishClimateAlert({
      ...message,
      messageId: 'message-2',
    });

    expect(connection.createConfirmChannel).toHaveBeenCalledTimes(1);
  });

  it('closes the channel and connection on module shutdown', async () => {
    const { channel, connection } = buildAmqpMocks();
    const adapter = new RabbitMqAlertPublisherAdapter(buildConfigService());

    await adapter.publishClimateAlert(message);
    await adapter.onModuleDestroy();

    expect(channel.close).toHaveBeenCalledTimes(1);
    expect(connection.close).toHaveBeenCalledTimes(1);
  });

  it('surfaces publish confirmation failures to the application service policy', async () => {
    const { channel } = buildAmqpMocks();
    channel.waitForConfirms.mockRejectedValue(new Error('broker unavailable'));
    const adapter = new RabbitMqAlertPublisherAdapter(buildConfigService());

    await expect(adapter.publishClimateAlert(message)).rejects.toThrow(
      'broker unavailable',
    );
  });
});
