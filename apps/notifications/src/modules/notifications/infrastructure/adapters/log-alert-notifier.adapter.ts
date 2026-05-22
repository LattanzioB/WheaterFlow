import { Injectable, Logger } from '@nestjs/common';
import { AlertNotifier } from '../../domain/ports/alert-notifier.port';
import { MeasurementAlertNotification } from '@contracts/notifications/measurement-alert-notification';

@Injectable()
export class LogAlertNotifierAdapter implements AlertNotifier {
  private readonly logger = new Logger(LogAlertNotifierAdapter.name);

  async sendMeasurementAlert(
    notification: MeasurementAlertNotification,
  ): Promise<void> {
    this.logger.log(
      `Alert for user ${notification.userId} at station ${notification.stationName}: ${notification.alertType}`,
    );
  }
}
