import { UserNotificationProfile } from '../../domain/entities/user-notification-profile.entity';
import {
  UserNotificationProfileModelDocument,
  UserNotificationProfilePersistence,
} from '../persistence/user-notification-profile.schema';

export class UserNotificationProfileMapper {
  static toPersistence(
    profile: UserNotificationProfile,
  ): UserNotificationProfilePersistence {
    return {
      _id: profile.getUserId(),
      notificationPreferences: profile.getNotificationPreferences(),
      deliveryChannels: profile.getDeliveryChannels(),
      telegramLinking: profile.getTelegramLinking(),
    };
  }

  static toDomain(
    document:
      | UserNotificationProfilePersistence
      | UserNotificationProfileModelDocument,
  ): UserNotificationProfile {
    return UserNotificationProfile.create({
      userId: document._id,
      notificationPreferences: document.notificationPreferences.map(
        (preference) => ({
          stationId: preference.stationId,
          alertTypes: [...preference.alertTypes],
        }),
      ),
      deliveryChannels: {
        telegram: {
          chatId: document.deliveryChannels.telegram.chatId,
        },
        log: {
          enabled: document.deliveryChannels.log?.enabled ?? true,
        },
        inApp: document.deliveryChannels.inApp ?? true,
      },
      telegramLinking: {
        code: document.telegramLinking?.code ?? null,
        expiresAt: document.telegramLinking?.expiresAt ?? null,
      },
    });
  }
}
