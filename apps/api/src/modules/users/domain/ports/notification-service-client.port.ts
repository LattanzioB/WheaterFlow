import { AlertType } from '../../../measurements/domain/value-objects/alert-type.enum';
import type {
  NotificationDeliveryChannels,
  NotificationProfileResponse,
  StationAlertPreference,
} from '@contracts/notifications/notification-profile';

export interface SubscribeToStationAlertsRequest {
  userId: string;
  stationId: string;
  alertTypes?: AlertType[];
}

export interface UpdateStationAlertPreferencesRequest {
  userId: string;
  stationId: string;
  alertTypes: AlertType[];
}

export interface UnsubscribeFromStationAlertsRequest {
  userId: string;
  stationId: string;
}

export interface UpdateDeliveryChannelsRequest {
  userId: string;
  deliveryChannels: {
    telegram?: { chatId?: string | null };
    log?: { enabled?: boolean };
    inApp?: boolean;
  };
}

export interface TelegramLinkCodeResponse {
  code: string;
  expiresAt: string;
  instructions: string;
  botUsername?: string;
  botUrl?: string;
}

export interface INotificationServiceClient {
  getProfile(userId: string): Promise<NotificationProfileResponse | null>;
  listSubscriptions(userId: string): Promise<StationAlertPreference[]>;
  subscribe(
    request: SubscribeToStationAlertsRequest,
  ): Promise<NotificationProfileResponse>;
  unsubscribe(
    request: UnsubscribeFromStationAlertsRequest,
  ): Promise<NotificationProfileResponse>;
  updateAlertPreferences(
    request: UpdateStationAlertPreferencesRequest,
  ): Promise<NotificationProfileResponse>;
  updateDeliveryChannels(
    request: UpdateDeliveryChannelsRequest,
  ): Promise<NotificationProfileResponse>;
  createTelegramLinkCode(userId: string): Promise<TelegramLinkCodeResponse>;
}

export type { NotificationDeliveryChannels, NotificationProfileResponse };
