import { Injectable, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { AlertNotifier } from '../../domain/ports/alert-notifier.port';
import {
  MeasurementAlertNotification,
  NotificationDeliveryTarget,
} from '../../domain/ports/measurement-alert-notification';

interface HttpClientLike {
  post(url: string, body: Record<string, unknown>): Promise<unknown>;
}

@Injectable()
export class TelegramAlertNotifierAdapter implements AlertNotifier {
  constructor(
    private readonly configService: ConfigService,
    @Optional()
    private readonly httpClient: HttpClientLike = axios,
  ) {}

  async sendMeasurementAlert(
    notification: MeasurementAlertNotification,
  ): Promise<void> {
    const botToken =
      this.configService.get<string>('telegram.botToken')?.trim() ?? '';

    if (!botToken) {
      return;
    }

    const telegramTargets = notification.deliveryTargets.filter((target) =>
      this.isTelegramTarget(target),
    );

    for (const target of telegramTargets) {
      await this.httpClient.post(
        `https://api.telegram.org/bot${botToken}/sendMessage`,
        {
          chat_id: target.destination,
          text: this.formatMessage(notification),
        },
      );
    }
  }

  private isTelegramTarget(target: NotificationDeliveryTarget): boolean {
    return target.channel === 'telegram';
  }

  private formatMessage(notification: MeasurementAlertNotification): string {
    return [
      `WeatherFlow alert: ${notification.alertType}`,
      `Station: ${notification.stationName}`,
      `Temperature: ${notification.temperature} C`,
      `Humidity: ${notification.humidity}%`,
      `Pressure: ${notification.pressure} hPa`,
      `Reported at: ${notification.reportedAt.toISOString()}`,
    ].join('\n');
  }
}
