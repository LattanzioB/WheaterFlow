import { MeasurementAlertNotification } from '@contracts/notifications/measurement-alert-notification';

export interface AlertNotifier {
  sendMeasurementAlert(
    notification: MeasurementAlertNotification,
  ): Promise<void>;
}
