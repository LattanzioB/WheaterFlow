import { Injectable, Optional, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  connect,
  type ChannelModel,
  type ConfirmChannel,
  type Options,
} from 'amqplib';
import type { Counter } from 'prom-client';
import type { ClimateAlertDetectedMessage } from '@contracts/measurements/climate-alert-detected.message';
import { injectTraceContext, MetricsService } from '@shared/observability';
import type { AlertPublisher } from '../../application/ports/alert-publisher.port';

@Injectable()
export class RabbitMqAlertPublisherAdapter
  implements AlertPublisher, OnModuleDestroy
{
  private connection?: ChannelModel;
  private channel?: ConfirmChannel;
  private readonly published?: Counter<'result'>;

  constructor(
    private readonly configService: ConfigService,
    @Optional() metrics?: MetricsService,
  ) {
    this.published = metrics?.getOrCreateCounter<'result'>({
      name: 'weatherflow_alerts_published_total',
      help: 'Climate alerts published to RabbitMQ by result.',
      labelNames: ['result'],
    });
    this.published?.inc({ result: 'success' }, 0);
    this.published?.inc({ result: 'failure' }, 0);
  }

  async publishClimateAlert(
    message: ClimateAlertDetectedMessage,
  ): Promise<void> {
    const exchange = this.configService.getOrThrow<string>(
      'rabbitmq.alertExchange',
    );
    const routingKey = this.configService.getOrThrow<string>(
      'rabbitmq.alertRoutingKey',
    );
    const payload = Buffer.from(JSON.stringify(message));
    const publishOptions: Options.Publish = {
      contentType: 'application/json',
      deliveryMode: 2,
      messageId: message.messageId,
      timestamp: Math.floor(new Date(message.occurredAt).getTime() / 1000),
      type: 'ClimateAlertDetectedMessage',
      headers: injectTraceContext(),
      ...(message.correlationId
        ? { correlationId: message.correlationId }
        : {}),
    };

    try {
      const channel = await this.getChannel();
      await channel.assertExchange(exchange, 'topic', { durable: true });
      channel.publish(exchange, routingKey, payload, publishOptions);
      await channel.waitForConfirms();
      this.published?.inc({ result: 'success' });
    } catch (error) {
      this.published?.inc({ result: 'failure' });
      throw error;
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.channel?.close();
    await this.connection?.close();
  }

  private async getChannel(): Promise<ConfirmChannel> {
    if (this.channel) {
      return this.channel;
    }

    const url = this.configService.getOrThrow<string>('rabbitmq.url');
    this.connection = await connect(url);
    this.channel = await this.connection.createConfirmChannel();

    return this.channel;
  }
}
