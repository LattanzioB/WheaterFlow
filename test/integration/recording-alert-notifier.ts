import type { MeasurementAlertNotification } from '@contracts';
import type { AlertNotifier } from '../../apps/notifications/src/modules/notifications/domain/ports/alert-notifier.port';

type NotificationPredicate = (
  notification: MeasurementAlertNotification,
) => boolean;

interface PendingNotificationWait {
  predicate: NotificationPredicate;
  resolve: (notification: MeasurementAlertNotification) => void;
  reject: (error: Error) => void;
  timer: NodeJS.Timeout;
}

export class RecordingAlertNotifier implements AlertNotifier {
  private readonly notifications: MeasurementAlertNotification[] = [];
  private readonly waits: PendingNotificationWait[] = [];

  sendMeasurementAlert(
    notification: MeasurementAlertNotification,
  ): Promise<void> {
    this.notifications.push(notification);
    this.resolveMatchingWaits(notification);

    return Promise.resolve();
  }

  getNotifications(): MeasurementAlertNotification[] {
    return [...this.notifications];
  }

  clear(): void {
    this.notifications.length = 0;
  }

  waitForNotification(
    predicate: NotificationPredicate,
    timeoutMs = 5_000,
  ): Promise<MeasurementAlertNotification> {
    const existing = this.notifications.find(predicate);

    if (existing) {
      return Promise.resolve(existing);
    }

    return new Promise((resolve, reject) => {
      const wait: PendingNotificationWait = {
        predicate,
        resolve,
        reject,
        timer: setTimeout(() => {
          this.removeWait(wait);
          reject(new Error('Timed out waiting for alert notification'));
        }, timeoutMs),
      };

      this.waits.push(wait);
    });
  }

  private resolveMatchingWaits(
    notification: MeasurementAlertNotification,
  ): void {
    for (const wait of [...this.waits]) {
      if (wait.predicate(notification)) {
        clearTimeout(wait.timer);
        this.removeWait(wait);
        wait.resolve(notification);
      }
    }
  }

  private removeWait(wait: PendingNotificationWait): void {
    const index = this.waits.indexOf(wait);

    if (index >= 0) {
      this.waits.splice(index, 1);
    }
  }
}
