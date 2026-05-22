import { AlertType } from '../../../measurements/domain/value-objects/alert-type.enum';
import { IUserRepository } from '../../domain/ports/user-repository.port';
import { INotificationServiceClient } from '../../domain/ports/notification-service-client.port';
import {
  UnsubscribeFromStationAlertsCommand,
  UnsubscribeFromStationAlertsService,
} from './unsubscribe-from-station-alerts.service';
import { User } from '../../domain/entities/user.entity';
import { Email } from '../../domain/value-objects/email.value-object';
import { UserNotificationProfileService } from './user-notification-profile.service';

describe('UnsubscribeFromStationAlertsService', () => {
  const command: UnsubscribeFromStationAlertsCommand = {
    userId: 'user-1',
    stationId: 'station-1',
  };

  const buildUserRepository = (): jest.Mocked<IUserRepository> => ({
    findById: jest.fn(),
    findByEmail: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
    findAll: jest.fn(),
  });

  const buildNotificationClient = (): jest.Mocked<INotificationServiceClient> => ({
    getProfile: jest.fn(),
    listSubscriptions: jest.fn(),
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
    updateAlertPreferences: jest.fn(),
    updateDeliveryChannels: jest.fn(),
    createTelegramLinkCode: jest.fn(),
  });

  it('removes an existing station subscription through the notification service', async () => {
    const userRepository = buildUserRepository();
    const notificationClient = buildNotificationClient();
    const service = new UnsubscribeFromStationAlertsService(
      userRepository,
      notificationClient,
      new UserNotificationProfileService(notificationClient),
    );
    const user = User.create({
      id: 'user-1',
      name: 'Bruno',
      lastName: 'Lattanzio',
      email: Email.create('bruno@example.com'),
      passwordHash: 'hash',
    });

    userRepository.findById.mockResolvedValue(user);
    notificationClient.unsubscribe.mockResolvedValue({
      userId: 'user-1',
      notificationPreferences: [
        {
          stationId: 'station-2',
          alertTypes: [AlertType.FROST],
        },
      ],
      deliveryChannels: {
        telegram: { chatId: null },
        log: { enabled: true },
      },
    });

    const result = await service.execute(command);

    expect(notificationClient.unsubscribe.mock.calls).toEqual([[command]]);
    expect(result.notificationProfile.notificationPreferences).toEqual([
      {
        stationId: 'station-2',
        alertTypes: [AlertType.FROST],
      },
    ]);
    expect(userRepository.save.mock.calls).toHaveLength(0);
  });

  it('rejects unknown users before saving', async () => {
    const userRepository = buildUserRepository();
    const notificationClient = buildNotificationClient();
    const service = new UnsubscribeFromStationAlertsService(
      userRepository,
      notificationClient,
      new UserNotificationProfileService(notificationClient),
    );

    userRepository.findById.mockResolvedValue(null);

    await expect(service.execute(command)).rejects.toThrow('User not found');
    expect(notificationClient.unsubscribe.mock.calls).toHaveLength(0);
  });
});
