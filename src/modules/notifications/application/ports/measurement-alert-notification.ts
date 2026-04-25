import { AlertType } from '../../../measurements/domain/value-objects/alert-type.enum';

export interface NotificationDeliveryTarget {
  channel: string;
  destination: string;
}

export interface MeasurementAlertNotification {
  userId: string;
  deliveryTargets: NotificationDeliveryTarget[];
  measurementId: string;
  stationId: string;
  stationName: string;
  alertType: AlertType;
  reportedAt: Date;
  temperature: number;
  humidity: number;
  pressure: number;
}
