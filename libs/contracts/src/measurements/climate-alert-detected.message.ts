import { AlertType } from './alert-type';

export interface ClimateAlertDetectedMessage {
  messageId: string;
  occurredAt: string;
  measurementId: string;
  stationId: string;
  stationName: string;
  alertType: AlertType;
  reportedAt: string;
  temperature: number;
  humidity: number;
  pressure: number;
}
