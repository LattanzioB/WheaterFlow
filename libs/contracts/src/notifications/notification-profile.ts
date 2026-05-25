import { AlertType } from '../measurements/alert-type';

export interface StationAlertPreference {
  stationId: string;
  alertTypes: AlertType[];
}

export interface NotificationDeliveryChannels {
  telegram: {
    chatId: string | null;
  };
  log: {
    enabled: boolean;
  };
  inApp?: boolean;
}

export interface NotificationProfileResponse {
  userId: string;
  notificationPreferences: StationAlertPreference[];
  deliveryChannels: NotificationDeliveryChannels;
}
