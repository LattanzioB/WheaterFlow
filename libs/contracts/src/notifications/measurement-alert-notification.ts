import { AlertType } from '../measurements/alert-type';

export interface NotificationDeliveryTarget {
  channel: string;
  destination: string;
}

export interface MeasurementAlertNotification {
  userId: string;
  deliveryTargets: NotificationDeliveryTarget[];
  messageId: string;
  measurementId: string;
  stationId: string;
  stationName: string;
  alertType: AlertType;
  reportedAt: Date;
  temperature: number;
  humidity: number;
  pressure: number;
}
