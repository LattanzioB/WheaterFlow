import { IStationRepository } from '../ports/station-repository.port';
import {
  CreateStationCommand,
  CreateStationService,
} from './create-station.service';
import { IUserRepository } from '../../../users/application/ports/user-repository.port';
import { StationStatus } from '../../domain/value-objects/station-status.enum';
import { User } from '../../../users/domain/entities/user.entity';
import { Email } from '../../../users/domain/value-objects/email.value-object';

describe('CreateStationService', () => {
  const command: CreateStationCommand = {
    name: 'Central',
    location: {
      latitude: -34.6037,
      longitude: -58.3816,
    },
    sensorModel: 'WH-1080',
    ownerId: 'user-1',
    status: StationStatus.INACTIVE,
    alertSettings: {
      storm: false,
    },
  };

  const buildStationRepository = (): jest.Mocked<IStationRepository> => ({
    findById: jest.fn(),
    findByOwnerId: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
    findAll: jest.fn(),
  });

  const buildUserRepository = (): jest.Mocked<IUserRepository> => ({
    findById: jest.fn(),
    findByEmail: jest.fn(),
    findByTelegramLinkCode: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
    findAll: jest.fn(),
    findSubscribersByStationId: jest.fn(),
  });

  const owner = User.create({
    id: 'user-1',
    name: 'Bruno',
    lastName: 'Owner',
    email: Email.create('bruno@example.com'),
    passwordHash: 'hash',
  });

  it('creates a station for an existing owner', async () => {
    const stationRepository = buildStationRepository();
    const userRepository = buildUserRepository();
    const service = new CreateStationService(stationRepository, userRepository);

    userRepository.findById.mockResolvedValue(owner);

    const result = await service.execute(command);

    expect(userRepository.findById.mock.calls).toEqual([['user-1']]);
    expect(stationRepository.save.mock.calls).toHaveLength(1);

    const savedStation = stationRepository.save.mock.calls[0][0];
    expect(savedStation.getName()).toBe('Central');
    expect(savedStation.getOwnerId()).toBe('user-1');
    expect(savedStation.getStatus()).toBe(StationStatus.INACTIVE);
    expect(savedStation.getLocation().getLatitude()).toBe(-34.6037);
    expect(savedStation.getAlertSettings().toPrimitives()).toEqual({
      extremeHeat: true,
      frost: true,
      storm: false,
      criticalHumidity: true,
    });
    expect(result).toBe(savedStation);
  });

  it('rejects unknown owners before saving', async () => {
    const stationRepository = buildStationRepository();
    const userRepository = buildUserRepository();
    const service = new CreateStationService(stationRepository, userRepository);

    userRepository.findById.mockResolvedValue(null);

    await expect(service.execute(command)).rejects.toThrow(
      'Owner user not found',
    );
    expect(stationRepository.save.mock.calls).toHaveLength(0);
  });
});
