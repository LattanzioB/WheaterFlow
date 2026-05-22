import {
  Injectable,
  Logger,
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
import { validateClimateAlertDetectedMessage } from '@contracts';
import { NotificationService } from '../../application/services/notification.service';

@Injectable()
export class RabbitMqClimateAlertConsumerAdapter
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(RabbitMqClimateAlertConsumerAdapter.name);
  private connection?: ChannelModel;
  private channel?: Channel;

  constructor(
    private readonly configService: ConfigService,
    private readonly notificationService: NotificationService,
  ) {}

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
        return;
      }

      await this.notificationService.handleClimateAlert(validation.message);
      this.channel.ack(message);
    } catch (error) {
      this.logger.error(
        'Dead-lettering climate alert message after consumer failure',
        error instanceof Error ? error.stack : String(error),
      );
      this.channel.nack(message, false, false);
    }
  }
}
