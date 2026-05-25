import { AlertNotifier } from '../../domain/ports/alert-notifier.port';
import { NotificationService } from './notification.service';
import { AlertType, type ClimateAlertDetectedMessage } from '@contracts';
import { UserNotificationProfile } from '../../../notification-preferences/domain/entities/user-notification-profile.entity';
import { INotificationProfileRepository } from '../../../notification-preferences/domain/ports/notification-profile-repository.port';

describe('NotificationService', () => {
  const buildAlertNotifier = (): jest.Mocked<AlertNotifier> => ({
    sendMeasurementAlert: jest.fn(),
  });

  const buildNotificationProfileRepository =
    (): jest.Mocked<INotificationProfileRepository> => ({
      findByUserId: jest.fn(),
      findByTelegramLinkCode: jest.fn(),
      findSubscribersByStationId: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    });

  const message: ClimateAlertDetectedMessage = {
    messageId: 'message-1',
    occurredAt: '2026-04-25T17:31:00.000Z',
    measurementId: 'measurement-1',
    stationId: 'station-1',
    stationName: 'Central',
    alertType: AlertType.STORM,
    reportedAt: '2026-04-25T17:30:00.000Z',
    temperature: 25,
    humidity: 92,
    pressure: 970,
  };

  it('filters recipients by alert preference and configured delivery targets', async () => {
    const alertNotifier = buildAlertNotifier();
    const notificationProfileRepository = buildNotificationProfileRepository();
    const service = new NotificationService(
      alertNotifier,
      notificationProfileRepository,
    );

    notificationProfileRepository.findSubscribersByStationId.mockResolvedValue([
      UserNotificationProfile.create({
        userId: 'user-1',
        notificationPreferences: [
          {
            stationId: 'station-1',
            alertTypes: [AlertType.STORM],
          },
        ],
        deliveryChannels: {
          telegram: {
            chatId: 'telegram-1',
          },
          log: {
            enabled: false,
          },
          inApp: false,
        },
      }),
      UserNotificationProfile.create({
        userId: 'user-2',
        notificationPreferences: [
          {
            stationId: 'station-1',
            alertTypes: [AlertType.STORM],
          },
        ],
        deliveryChannels: {
          telegram: {
            chatId: null,
          },
          log: {
            enabled: false,
          },
          inApp: false,
        },
      }),
      UserNotificationProfile.create({
        userId: 'user-3',
        notificationPreferences: [
          {
            stationId: 'station-1',
            alertTypes: [AlertType.FROST],
          },
        ],
        deliveryChannels: {
          telegram: {
            chatId: 'telegram-3',
          },
          log: {
            enabled: true,
          },
          inApp: true,
        },
      }),
    ]);

    await service.handleClimateAlert(message);

    expect(
      notificationProfileRepository.findSubscribersByStationId.mock.calls,
    ).toEqual([['station-1']]);
    expect(alertNotifier.sendMeasurementAlert.mock.calls).toHaveLength(1);
    expect(alertNotifier.sendMeasurementAlert.mock.calls[0][0]).toEqual({
      userId: 'user-1',
      deliveryTargets: [{ channel: 'telegram', destination: 'telegram-1' }],
      messageId: 'message-1',
      measurementId: 'measurement-1',
      stationId: 'station-1',
      stationName: 'Central',
      alertType: AlertType.STORM,
      reportedAt: new Date('2026-04-25T17:30:00.000Z'),
      temperature: 25,
      humidity: 92,
      pressure: 970,
    });
  });

  it('delivers to the local log target when log delivery is configured', async () => {
    const alertNotifier = buildAlertNotifier();
    const notificationProfileRepository = buildNotificationProfileRepository();
    const service = new NotificationService(
      alertNotifier,
      notificationProfileRepository,
    );

    notificationProfileRepository.findSubscribersByStationId.mockResolvedValue([
      UserNotificationProfile.create({
        userId: 'user-1',
        notificationPreferences: [
          {
            stationId: 'station-1',
            alertTypes: [AlertType.STORM],
          },
        ],
        deliveryChannels: {
          log: {
            enabled: true,
          },
        },
      }),
    ]);

    await service.handleClimateAlert(message);

    expect(alertNotifier.sendMeasurementAlert).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        deliveryTargets: [
          { channel: 'log', destination: 'user-1' },
          { channel: 'in-app', destination: 'user-1' },
        ],
      }),
    );
  });

  it('emits in-app targets for enabled subscribers', async () => {
    const alertNotifier = buildAlertNotifier();
    const notificationProfileRepository = buildNotificationProfileRepository();
    const service = new NotificationService(
      alertNotifier,
      notificationProfileRepository,
    );

    notificationProfileRepository.findSubscribersByStationId.mockResolvedValue([
      UserNotificationProfile.create({
        userId: 'user-1',
        notificationPreferences: [
          {
            stationId: 'station-1',
            alertTypes: [AlertType.STORM],
          },
        ],
        deliveryChannels: {
          telegram: {
            chatId: 'telegram-1',
          },
          log: {
            enabled: false,
          },
          inApp: true,
        },
      }),
      UserNotificationProfile.create({
        userId: 'user-2',
        notificationPreferences: [
          {
            stationId: 'station-1',
            alertTypes: [AlertType.STORM],
          },
        ],
        deliveryChannels: {
          telegram: {
            chatId: null,
          },
          log: {
            enabled: false,
          },
          inApp: false,
        },
      }),
    ]);

    await service.handleClimateAlert(message);

    expect(alertNotifier.sendMeasurementAlert.mock.calls).toHaveLength(1);
    expect(alertNotifier.sendMeasurementAlert).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        deliveryTargets: [
          { channel: 'telegram', destination: 'telegram-1' },
          { channel: 'in-app', destination: 'user-1' },
        ],
      }),
    );
  });
});
