import { UserNotificationProfile } from '../../domain/entities/user-notification-profile.entity';
import { NotificationProfileResponseDto } from '../dtos/notification-profile.dto';

export class NotificationProfileResponseMapper {
  static toResponse(
    profile: UserNotificationProfile,
  ): NotificationProfileResponseDto {
    return {
      userId: profile.getUserId(),
      notificationPreferences: profile.getNotificationPreferences(),
      deliveryChannels: profile.getDeliveryChannels(),
    };
  }
}
