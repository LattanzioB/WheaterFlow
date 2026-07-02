import {
  Injectable,
  Logger,
  Optional,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  connect,
  type Channel,
  type ChannelModel,
  type ConsumeMessage,
} from 'amqplib';
import type { Counter } from 'prom-client';
import { validateClimateAlertDetectedMessage } from '@contracts';
import {
  MetricsService,
  runWithExtractedTraceContext,
} from '@shared/observability';
import { NotificationService } from '../../application/services/notification.service';

@Injectable()
export class RabbitMqClimateAlertConsumerAdapter
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(
    RabbitMqClimateAlertConsumerAdapter.name,
  );
  private connection?: ChannelModel;
  private channel?: Channel;
  private readonly consumed?: Counter<'result'>;

  constructor(
    private readonly configService: ConfigService,
    private readonly notificationService: NotificationService,
    @Optional() metrics?: MetricsService,
  ) {
    this.consumed = metrics?.getOrCreateCounter<'result'>({
      name: 'weatherflow_rabbitmq_messages_consumed_total',
      help: 'Climate alert messages consumed from RabbitMQ by result.',
      labelNames: ['result'],
    });
    for (const result of ['processed', 'rejected', 'error'] as const) {
      this.consumed?.inc({ result }, 0);
    }
  }

  async onModuleInit(): Promise<void> {
    await this.start();
  }

  async onModuleDestroy(): Promise<void> {
    await this.channel?.close();
    await this.connection?.close();
  }

  async start(): Promise<void> {
    if (this.channel) {
      return;
    }

    const url = this.configService.getOrThrow<string>('rabbitmq.url');
    const exchange = this.configService.getOrThrow<string>(
      'rabbitmq.alertExchange',
    );
    const queue = this.configService.getOrThrow<string>('rabbitmq.alertQueue');
    const routingKey = this.configService.getOrThrow<string>(
      'rabbitmq.alertRoutingKey',
    );

    this.connection = await connect(url);
    this.channel = await this.connection.createChannel();

    await this.channel.assertExchange(exchange, 'topic', { durable: true });
    await this.channel.assertQueue(queue, { durable: true });
    await this.channel.bindQueue(queue, exchange, routingKey);
    await this.channel.prefetch(1);
    await this.channel.consume(
      queue,
      (message) => {
        void this.handleDelivery(message);
      },
      { noAck: false },
    );
  }

  async handleDelivery(message: ConsumeMessage | null): Promise<void> {
    if (!message) {
      return;
    }

    if (!this.channel) {
      throw new Error('RabbitMQ consumer channel is not initialized');
    }

    try {
      const payload = JSON.parse(message.content.toString('utf8')) as unknown;
      const validation = validateClimateAlertDetectedMessage(payload);

      if (!validation.valid || !validation.message) {
        this.logger.warn(
          `Dead-lettering malformed climate alert message: ${validation.errors.join('; ')}`,
        );
        this.channel.nack(message, false, false);
        this.consumed?.inc({ result: 'rejected' });
        return;
      }

      const validMessage = validation.message;
      await runWithExtractedTraceContext(message.properties.headers, () =>
        this.notificationService.handleClimateAlert(validMessage),
      );
      this.channel.ack(message);
      this.consumed?.inc({ result: 'processed' });
    } catch (error) {
      this.logger.error(
        'Dead-lettering climate alert message after consumer failure',
        error instanceof Error ? error.stack : String(error),
      );
      this.channel.nack(message, false, false);
      this.consumed?.inc({ result: 'error' });
    }
  }
}
