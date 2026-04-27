import { AlertType } from '../../../measurements/domain/value-objects/alert-type.enum';
import { IStationRepository } from '../../../stations/application/ports/station-repository.port';
import { WeatherStation } from '../../../stations/domain/entities/weather-station.entity';
import { Location } from '../../../stations/domain/value-objects/location.value-object';
import { IUserRepository } from '../ports/user-repository.port';
import {
  UpdateStationAlertPreferencesCommand,
  UpdateStationAlertPreferencesService,
} from './update-station-alert-preferences.service';
import { User } from '../../domain/entities/user.entity';
import { Email } from '../../domain/value-objects/email.value-object';

describe('UpdateStationAlertPreferencesService', () => {
  const command: UpdateStationAlertPreferencesCommand = {
    userId: 'user-1',
    stationId: 'station-1',
    alertTypes: [AlertType.EXTREME_HEAT],
  };

  const buildUserRepository = (): jest.Mocked<IUserRepository> => ({
    findById: jest.fn(),
    findByEmail: jest.fn(),
    findByTelegramLinkCode: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
    findAll: jest.fn(),
    findSubscribersByStationId: jest.fn(),
  });

  const buildStationRepository = (): jest.Mocked<IStationRepository> => ({
    findById: jest.fn(),
    findByOwnerId: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
    findAll: jest.fn(),
  });

  const station = WeatherStation.create({
    id: 'station-1',
    name: 'Central',
    location: Location.create(-34.6037, -58.3816),
    sensorModel: 'WH-1080',
    ownerId: 'owner-1',
  });

  it('updates the alert types for an existing station subscription', async () => {
    const userRepository = buildUserRepository();
    const stationRepository = buildStationRepository();
    const service = new UpdateStationAlertPreferencesService(
      userRepository,
      stationRepository,
    );
    const user = User.create({
      id: 'user-1',
      name: 'Bruno',
      lastName: 'Lattanzio',
      email: Email.create('bruno@example.com'),
      passwordHash: 'hash',
      notificationPreferences: [
        {
          stationId: 'station-1',
          alertTypes: [AlertType.STORM],
        },
      ],
    });

    userRepository.findById.mockResolvedValue(user);
    stationRepository.findById.mockResolvedValue(station);

    const result = await service.execute(command);

    expect(result.getSubscribedAlertTypesForStation('station-1')).toEqual([
      AlertType.EXTREME_HEAT,
    ]);
    expect(userRepository.save.mock.calls).toEqual([[result]]);
  });

  it('rejects missing users and stations before saving', async () => {
    const userRepository = buildUserRepository();
    const stationRepository = buildStationRepository();
    const service = new UpdateStationAlertPreferencesService(
      userRepository,
      stationRepository,
    );

    userRepository.findById.mockResolvedValue(null);

    await expect(service.execute(command)).rejects.toThrow('User not found');
    expect(stationRepository.findById.mock.calls).toHaveLength(0);

    const user = User.create({
      id: 'user-1',
      name: 'Bruno',
      lastName: 'Lattanzio',
      email: Email.create('bruno@example.com'),
      passwordHash: 'hash',
      notificationPreferences: [
        {
          stationId: 'station-1',
          alertTypes: [AlertType.STORM],
        },
      ],
    });

    userRepository.findById.mockResolvedValue(user);
    stationRepository.findById.mockResolvedValue(null);

    await expect(service.execute(command)).rejects.toThrow('Station not found');
    expect(userRepository.save.mock.calls).toHaveLength(0);
  });
});
