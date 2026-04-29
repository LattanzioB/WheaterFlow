import { IStationRepository } from '../ports/station-repository.port';
import {
  ListUserStationsCommand,
  ListUserStationsService,
} from './list-user-stations.service';
import { WeatherStation } from '../../domain/entities/weather-station.entity';
import { Location } from '../../domain/value-objects/location.value-object';

describe('ListUserStationsService', () => {
  const command: ListUserStationsCommand = {
    ownerId: ' owner-1 ',
  };

  const buildStationRepository = (): jest.Mocked<IStationRepository> => ({
    findById: jest.fn(),
    findByIds: jest.fn(),
    findByOwnerId: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
    findAll: jest.fn(),
  });

  it('lists the stations for a normalized owner id', async () => {
    const stationRepository = buildStationRepository();
    const service = new ListUserStationsService(stationRepository);
    const stations = [
      WeatherStation.create({
        id: 'station-1',
        name: 'Central',
        location: Location.create(-34.6037, -58.3816),
        sensorModel: 'WH-1080',
        ownerId: 'owner-1',
      }),
    ];

    stationRepository.findByOwnerId.mockResolvedValue(stations);

    const result = await service.execute(command);

    expect(stationRepository.findByOwnerId.mock.calls).toEqual([['owner-1']]);
    expect(result).toEqual(stations);
  });

  it('rejects blank owner ids before hitting the repository', async () => {
    const stationRepository = buildStationRepository();
    const service = new ListUserStationsService(stationRepository);

    await expect(
      service.execute({
        ownerId: '   ',
      }),
    ).rejects.toThrow('Owner id cannot be empty');
    expect(stationRepository.findByOwnerId.mock.calls).toHaveLength(0);
  });
});
