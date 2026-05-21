import { IStationRepository } from '../../domain/ports/station-repository.port';
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
    findWithFilters: jest.fn(),
  });

  it('lists the stations for a normalized owner id and optional name', async () => {
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

    stationRepository.findWithFilters.mockResolvedValue(stations);

    const result = await service.execute({
      ...command,
      name: ' Central ',
    });

    expect(stationRepository.findWithFilters.mock.calls).toEqual([
      [{ ownerId: 'owner-1', name: 'Central' }],
    ]);
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
    expect(stationRepository.findWithFilters.mock.calls).toHaveLength(0);
  });
});
