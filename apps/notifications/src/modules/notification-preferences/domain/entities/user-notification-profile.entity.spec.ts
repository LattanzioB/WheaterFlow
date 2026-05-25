import { AlertType } from '@contracts/measurements/alert-type';
import { UserNotificationProfile } from './user-notification-profile.entity';

describe('UserNotificationProfile', () => {
  it('subscribes, updates, and unsubscribes station alert preferences', () => {
    const profile = UserNotificationProfile.create({ userId: 'user-1' });

    profile.subscribeToAlerts('station-1', [AlertType.STORM]);
    profile.updateAlertTypesForStation('station-1', [
      AlertType.STORM,
      AlertType.FROST,
    ]);
    profile.unsubscribeFromAlerts('station-1');

    expect(profile.getNotificationPreferences()).toEqual([]);
  });

  it('configures telegram, log, and in-app delivery channels', () => {
    const profile = UserNotificationProfile.create({ userId: 'user-1' });

    profile.configureTelegramDelivery('12345');
    profile.configureLogDelivery(false);
    profile.configureInAppDelivery(false);

    expect(profile.getDeliveryChannels()).toEqual({
      telegram: { chatId: '12345' },
      log: { enabled: false },
      inApp: false,
    });
    expect(profile.hasDeliveryChannelConfigured()).toBe(true);
  });

  it('defaults in-app delivery to enabled for new profiles', () => {
    const profile = UserNotificationProfile.create({ userId: 'user-1' });

    expect(profile.getDeliveryChannels().inApp).toBe(true);
  });

  it('completes telegram linking from an active code', () => {
    const profile = UserNotificationProfile.create({ userId: 'user-1' });

    profile.startTelegramLinking('WF-AB12CD34', new Date(Date.now() + 60_000));
    profile.completeTelegramLinking('99999');

    expect(profile.getDeliveryChannels().telegram.chatId).toBe('99999');
    expect(profile.getTelegramLinking()).toEqual({
      code: null,
      expiresAt: null,
    });
  });
});
