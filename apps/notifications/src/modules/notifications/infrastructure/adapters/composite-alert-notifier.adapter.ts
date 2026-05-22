import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AlertNotifier } from '../../domain/ports/alert-notifier.port';
import { MeasurementAlertNotification } from '@contracts/notifications/measurement-alert-notification';
import { LogAlertNotifierAdapter } from './log-alert-notifier.adapter';
import { TelegramAlertNotifierAdapter } from './telegram-alert-notifier.adapter';

@Injectable()
export class CompositeAlertNotifierAdapter implements AlertNotifier {
  constructor(
    private readonly configService: ConfigService,
    private readonly logNotifier: LogAlertNotifierAdapter,
    private readonly telegramNotifier: TelegramAlertNotifierAdapter,
  ) {}

  async sendMeasurementAlert(
    notification: MeasurementAlertNotification,
  ): Promise<void> {
    const deliveryMode =
      this.configService.get<string>('notifications.deliveryMode') ?? 'log';

    if (deliveryMode === 'telegram') {
      await this.telegramNotifier.sendMeasurementAlert(notification);
      return;
    }

    await this.logNotifier.sendMeasurementAlert(notification);
  }
}
