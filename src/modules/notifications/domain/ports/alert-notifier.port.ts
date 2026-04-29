import { MeasurementAlertNotification } from './measurement-alert-notification';

export interface AlertNotifier {
  sendMeasurementAlert(
    notification: MeasurementAlertNotification,
  ): Promise<void>;
}
