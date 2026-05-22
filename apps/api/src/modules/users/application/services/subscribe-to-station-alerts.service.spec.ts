import { AlertType } from '../../../measurements/domain/value-objects/alert-type.enum';
import { IStationRepository } from '../../../stations/domain/ports/station-repository.port';
import { WeatherStation } from '../../../stations/domain/entities/weather-station.entity';
import { Location } from '../../../stations/domain/value-objects/location.value-object';
import { IUserRepository } from '../../domain/ports/user-repository.port';
import { INotificationServiceClient } from '../../domain/ports/notification-service-client.port';
import {
  SubscribeToStationAlertsCommand,
  SubscribeToStationAlertsService,
} from './subscribe-to-station-alerts.service';
import { User } from '../../domain/entities/user.entity';
import { Email } from '../../domain/value-objects/email.value-object';
import { UserNotificationProfileService } from './user-notification-profile.service';

describe('SubscribeToStationAlertsService', () => {
  const command: SubscribeToStationAlertsCommand = {
    userId: 'user-1',
    stationId: 'station-1',
    alertTypes: [AlertType.STORM, AlertType.CRITICAL_HUMIDITY],
  };

  const buildUserRepository = (): jest.Mocked<IUserRepository> => ({
    findById: jest.fn(),
    findByEmail: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
    findAll: jest.fn(),
  });

  const buildStationRepository = (): jest.Mocked<IStationRepository> => ({
    findById: jest.fn(),
    findByIds: jest.fn(),
    findByOwnerId: jest.fn(),
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

  const user = User.create({
    id: 'user-1',
    name: 'Bruno',
    lastName: 'Lattanzio',
    email: Email.create('bruno@example.com'),
    passwordHash: 'hash',
  });

  const station = WeatherStation.create({
    id: 'station-1',
    name: 'Central',
    location: Location.create(-34.6037, -58.3816),
    sensorModel: 'WH-1080',
    ownerId: 'owner-1',
  });

  it('subscribes a user to selected alert types for an existing station', async () => {
    const userRepository = buildUserRepository();
    const stationRepository = buildStationRepository();
    const notificationClient = buildNotificationClient();
    const service = new SubscribeToStationAlertsService(
      userRepository,
      stationRepository,
      notificationClient,
      new UserNotificationProfileService(notificationClient),
    );

    userRepository.findById.mockResolvedValue(user);
    stationRepository.findById.mockResolvedValue(station);
    notificationClient.subscribe.mockResolvedValue({
      userId: 'user-1',
      notificationPreferences: [
        {
          stationId: 'station-1',
          alertTypes: [AlertType.STORM, AlertType.CRITICAL_HUMIDITY],
        },
      ],
      deliveryChannels: {
        telegram: { chatId: null },
        log: { enabled: true },
      },
    });

    const result = await service.execute(command);

    expect(notificationClient.subscribe.mock.calls).toEqual([[command]]);
    expect(result.notificationProfile.notificationPreferences).toEqual([
      {
        stationId: 'station-1',
        alertTypes: [AlertType.STORM, AlertType.CRITICAL_HUMIDITY],
      },
    ]);
    expect(userRepository.save.mock.calls).toHaveLength(0);
  });

  it('rejects unknown users and stations before saving', async () => {
    const userRepository = buildUserRepository();
    const stationRepository = buildStationRepository();
    const notificationClient = buildNotificationClient();
    const service = new SubscribeToStationAlertsService(
      userRepository,
      stationRepository,
      notificationClient,
      new UserNotificationProfileService(notificationClient),
    );

    userRepository.findById.mockResolvedValue(null);

    await expect(service.execute(command)).rejects.toThrow('User not found');
    expect(notificationClient.subscribe.mock.calls).toHaveLength(0);
  });
});
