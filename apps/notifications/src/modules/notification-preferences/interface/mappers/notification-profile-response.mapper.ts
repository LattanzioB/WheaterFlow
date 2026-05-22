import type { NotificationProfileResponse } from '@contracts/notifications/notification-profile';
import { UserNotificationProfile } from '../../domain/entities/user-notification-profile.entity';

export class NotificationProfileResponseMapper {
  static toResponse(
    profile: UserNotificationProfile,
  ): NotificationProfileResponse {
    return {
      userId: profile.getUserId(),
      notificationPreferences: profile.getNotificationPreferences(),
      deliveryChannels: profile.getDeliveryChannels(),
    };
  }
}
