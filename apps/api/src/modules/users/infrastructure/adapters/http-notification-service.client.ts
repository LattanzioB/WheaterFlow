import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import type { NotificationProfileResponse } from '@contracts/notifications/notification-profile';
import type {
  INotificationServiceClient,
  SubscribeToStationAlertsRequest,
  TelegramLinkCodeResponse,
  UnsubscribeFromStationAlertsRequest,
  UpdateDeliveryChannelsRequest,
  UpdateStationAlertPreferencesRequest,
} from '../../domain/ports/notification-service-client.port';

@Injectable()
export class HttpNotificationServiceClient implements INotificationServiceClient {
  private readonly httpClient: AxiosInstance;

  constructor(private readonly configService: ConfigService) {
    const baseURL =
      this.configService.get<string>('notifications.serviceUrl')?.trim() ??
      'http://localhost:3001';

    this.httpClient = axios.create({
      baseURL,
      timeout: 10_000,
      validateStatus: () => true,
    });
  }

  async getProfile(userId: string): Promise<NotificationProfileResponse | null> {
    const response = await this.httpClient.get<NotificationProfileResponse>(
      `/notification-preferences/users/${encodeURIComponent(userId)}`,
    );

    if (response.status === 404) {
      return null;
    }

    this.ensureSuccess(response.status, response.data);

    return response.data;
  }

  async listSubscriptions(userId: string) {
    const response = await this.httpClient.get(
      `/notification-preferences/users/${encodeURIComponent(userId)}/subscriptions`,
    );

    this.ensureSuccess(response.status, response.data);

    return response.data;
  }

  async subscribe(request: SubscribeToStationAlertsRequest) {
    const body =
      request.alertTypes !== undefined && request.alertTypes !== null
        ? { alertTypes: request.alertTypes }
        : {};

    const response = await this.httpClient.post<NotificationProfileResponse>(
      `/notification-preferences/users/${encodeURIComponent(request.userId)}/subscriptions/${encodeURIComponent(request.stationId)}`,
      body,
    );

    this.ensureSuccess(response.status, response.data);

    return response.data;
  }

  async unsubscribe(request: UnsubscribeFromStationAlertsRequest) {
    const response = await this.httpClient.delete<NotificationProfileResponse>(
      `/notification-preferences/users/${encodeURIComponent(request.userId)}/subscriptions/${encodeURIComponent(request.stationId)}`,
    );

    this.ensureSuccess(response.status, response.data);

    return response.data;
  }

  async updateAlertPreferences(request: UpdateStationAlertPreferencesRequest) {
    const response = await this.httpClient.patch<NotificationProfileResponse>(
      `/notification-preferences/users/${encodeURIComponent(request.userId)}/subscriptions/${encodeURIComponent(request.stationId)}`,
      {
        alertTypes: request.alertTypes,
      },
    );

    this.ensureSuccess(response.status, response.data);

    return response.data;
  }

  async updateDeliveryChannels(request: UpdateDeliveryChannelsRequest) {
    const response = await this.httpClient.patch<NotificationProfileResponse>(
      `/notification-preferences/users/${encodeURIComponent(request.userId)}/delivery-channels`,
      {
        deliveryChannels: request.deliveryChannels,
      },
    );

    this.ensureSuccess(response.status, response.data);

    return response.data;
  }

  async createTelegramLinkCode(userId: string): Promise<TelegramLinkCodeResponse> {
    const response = await this.httpClient.post<TelegramLinkCodeResponse>(
      `/notification-preferences/users/${encodeURIComponent(userId)}/delivery-channels/telegram/link-code`,
    );

    this.ensureSuccess(response.status, response.data);

    return response.data;
  }

  private ensureSuccess(status: number, data: unknown): void {
    if (status >= 200 && status < 300) {
      return;
    }

    const message = this.extractErrorMessage(data);

    if (status === 404) {
      throw new Error(message ?? 'Notification profile not found');
    }

    throw new Error(message ?? 'Notification service request failed');
  }

  private extractErrorMessage(data: unknown): string | undefined {
    if (!data || typeof data !== 'object') {
      return undefined;
    }

    const payload = data as { message?: string | string[] };

    if (Array.isArray(payload.message)) {
      return payload.message.join(', ');
    }

    return typeof payload.message === 'string' ? payload.message : undefined;
  }
}
