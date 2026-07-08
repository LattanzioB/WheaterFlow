import { Inject, Injectable, Logger } from '@nestjs/common';
import { AlertNotifier } from '../../domain/ports/alert-notifier.port';
import { MeasurementAlertNotification } from '@contracts/notifications/measurement-alert-notification';
import { ALERT_NOTIFIERS_TOKEN } from '@shared/tokens/injection-tokens';

@Injectable()
export class CompositeAlertNotifierAdapter implements AlertNotifier {
  private readonly logger = new Logger(CompositeAlertNotifierAdapter.name);

  constructor(
    @Inject(ALERT_NOTIFIERS_TOKEN)
    private readonly notifiers: AlertNotifier[],
  ) {}

  async sendMeasurementAlert(
    notification: MeasurementAlertNotification,
  ): Promise<void> {
    for (const notifier of this.notifiers) {
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
