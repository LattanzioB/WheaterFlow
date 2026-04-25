import { AlertType } from '../../../measurements/domain/value-objects/alert-type.enum';

export interface MeasurementAlertNotification {
  userId: string;
  telegramChatId: string;
  measurementId: string;
  stationId: string;
  stationName: string;
  alertType: AlertType;
  reportedAt: Date;
  temperature: number;
  humidity: number;
  pressure: number;
}
