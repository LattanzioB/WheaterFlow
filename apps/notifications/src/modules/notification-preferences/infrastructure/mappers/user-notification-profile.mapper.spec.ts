import { AlertType } from '@contracts/measurements/alert-type';
import { UserNotificationProfile } from '../../domain/entities/user-notification-profile.entity';
import { UserNotificationProfileMapper } from './user-notification-profile.mapper';

describe('UserNotificationProfileMapper', () => {
  it('persists and restores the in-app delivery channel', () => {
    const profile = UserNotificationProfile.create({
      userId: 'user-1',
      notificationPreferences: [
        {
          stationId: 'station-1',
          alertTypes: [AlertType.STORM],
        },
      ],
      deliveryChannels: {
        telegram: { chatId: '12345' },
        log: { enabled: false },
        inApp: false,
      },
    });

    const persistence = UserNotificationProfileMapper.toPersistence(profile);
    const mapped = UserNotificationProfileMapper.toDomain(persistence);

    expect(persistence.deliveryChannels.inApp).toBe(false);
    expect(mapped.getDeliveryChannels()).toEqual({
      telegram: { chatId: '12345' },
      log: { enabled: false },
      inApp: false,
    });
  });

  it('defaults missing legacy in-app channel values to enabled', () => {
    const mapped = UserNotificationProfileMapper.toDomain({
      _id: 'user-1',
      notificationPreferences: [],
      deliveryChannels: {
        telegram: { chatId: null },
        log: { enabled: false },
      } as any,
      telegramLinking: {
        code: null,
        expiresAt: null,
      },
    });

    expect(mapped.getDeliveryChannels().inApp).toBe(true);
  });
});
