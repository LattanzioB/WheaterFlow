import { Injectable } from '@nestjs/common';
import { AlertType } from '@contracts/measurements/alert-type';
import { GetNotificationProfileService } from './get-notification-profile.service';

export interface NotificationPreferenceSummary {
  stationId: string;
  alertTypes: AlertType[];
}

@Injectable()
export class ListNotificationPreferencesService {
  constructor(
    private readonly getNotificationProfileService: GetNotificationProfileService,
  ) {}

  async execute(userId: string): Promise<NotificationPreferenceSummary[]> {
    const profile = await this.getNotificationProfileService.execute(userId);

    if (!profile) {
      return [];
    }

    return profile.getNotificationPreferences();
  }
}
