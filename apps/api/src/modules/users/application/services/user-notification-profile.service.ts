import { Inject, Injectable } from '@nestjs/common';
import { NOTIFICATION_SERVICE_CLIENT_TOKEN } from '@shared/tokens/injection-tokens';
import type { NotificationProfileResponse } from '@contracts/notifications/notification-profile';
import type { INotificationServiceClient } from '../../domain/ports/notification-service-client.port';
import type { User } from '../../domain/entities/user.entity';

export interface UserWithNotificationProfile {
  user: User;
  notificationProfile: NotificationProfileResponse;
}

@Injectable()
export class UserNotificationProfileService {
  constructor(
    @Inject(NOTIFICATION_SERVICE_CLIENT_TOKEN)
    private readonly notificationServiceClient: INotificationServiceClient,
  ) {}

  async attachProfile(user: User): Promise<UserWithNotificationProfile> {
    const remoteProfile = await this.notificationServiceClient.getProfile(
      user.getId(),
    );

    return {
      user,
      notificationProfile:
        remoteProfile ?? this.createEmptyProfile(user.getId()),
    };
  }

  withRemoteProfile(
    user: User,
    notificationProfile: NotificationProfileResponse,
  ): UserWithNotificationProfile {
    return {
      user,
      notificationProfile,
    };
  }

  private createEmptyProfile(userId: string): NotificationProfileResponse {
    return {
      userId,
      notificationPreferences: [],
      deliveryChannels: {
        telegram: { chatId: null },
        log: { enabled: true },
      },
    };
  }
}
