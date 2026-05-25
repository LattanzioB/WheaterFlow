import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AlertNotifier } from '../../domain/ports/alert-notifier.port';
import { MeasurementAlertNotification } from '@contracts/notifications/measurement-alert-notification';
import { InAppAlertNotifierAdapter } from './in-app-alert-notifier.adapter';
import { LogAlertNotifierAdapter } from './log-alert-notifier.adapter';
import { TelegramAlertNotifierAdapter } from './telegram-alert-notifier.adapter';

@Injectable()
export class CompositeAlertNotifierAdapter implements AlertNotifier {
  private readonly logger = new Logger(CompositeAlertNotifierAdapter.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly logNotifier: LogAlertNotifierAdapter,
    private readonly telegramNotifier: TelegramAlertNotifierAdapter,
    private readonly inAppNotifier: InAppAlertNotifierAdapter,
  ) {}

  async sendMeasurementAlert(
    notification: MeasurementAlertNotification,
  ): Promise<void> {
    const deliveryMode =
      this.configService.get<string>('notifications.deliveryMode') ?? 'log';
    const notifiers =
      deliveryMode === 'telegram'
        ? [this.telegramNotifier, this.inAppNotifier]
        : [this.logNotifier, this.inAppNotifier];

    for (const notifier of notifiers) {
      try {
        await notifier.sendMeasurementAlert(notification);
      } catch (error) {
        this.logger.error(
          `Alert notifier ${notifier.constructor.name} failed`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }
  }
}
