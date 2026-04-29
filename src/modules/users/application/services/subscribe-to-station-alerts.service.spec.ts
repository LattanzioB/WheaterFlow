import { AlertType } from '../../../measurements/domain/value-objects/alert-type.enum';
import { IStationRepository } from '../../../stations/application/ports/station-repository.port';
import { WeatherStation } from '../../../stations/domain/entities/weather-station.entity';
import { Location } from '../../../stations/domain/value-objects/location.value-object';
import { IUserRepository } from '../ports/user-repository.port';
import {
  SubscribeToStationAlertsCommand,
  SubscribeToStationAlertsService,
} from './subscribe-to-station-alerts.service';
import { User } from '../../domain/entities/user.entity';
import { Email } from '../../domain/value-objects/email.value-object';

describe('SubscribeToStationAlertsService', () => {
  const command: SubscribeToStationAlertsCommand = {
    userId: 'user-1',
    stationId: 'station-1',
    alertTypes: [AlertType.STORM, AlertType.CRITICAL_HUMIDITY],
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
    findByIds: jest.fn(),
    findByOwnerId: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
    findAll: jest.fn(),
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
    const service = new SubscribeToStationAlertsService(
      userRepository,
      stationRepository,
    );

    userRepository.findById.mockResolvedValue(user);
    stationRepository.findById.mockResolvedValue(station);

    const result = await service.execute(command);

    expect(userRepository.findById.mock.calls).toEqual([['user-1']]);
    expect(stationRepository.findById.mock.calls).toEqual([['station-1']]);
    expect(result.getSubscribedAlertTypesForStation('station-1')).toEqual([
      AlertType.STORM,
      AlertType.CRITICAL_HUMIDITY,
    ]);
    expect(userRepository.save.mock.calls).toEqual([[result]]);
  });

  it('rejects unknown users and stations before saving', async () => {
    const userRepository = buildUserRepository();
    const stationRepository = buildStationRepository();
    const service = new SubscribeToStationAlertsService(
      userRepository,
      stationRepository,
    );

    userRepository.findById.mockResolvedValue(null);

    await expect(service.execute(command)).rejects.toThrow('User not found');
    expect(stationRepository.findById.mock.calls).toHaveLength(0);
    expect(userRepository.save.mock.calls).toHaveLength(0);

    userRepository.findById.mockResolvedValue(user);
    stationRepository.findById.mockResolvedValue(null);

    await expect(service.execute(command)).rejects.toThrow('Station not found');
    expect(userRepository.save.mock.calls).toHaveLength(0);
  });
});
