import { IStationRepository } from '../ports/station-repository.port';
import { WeatherStation } from '../../domain/entities/weather-station.entity';
import { Location } from '../../domain/value-objects/location.value-object';
import { GetStationByIdService } from './get-station-by-id.service';

describe('GetStationByIdService', () => {
  const buildStationRepository = (): jest.Mocked<IStationRepository> => ({
    findById: jest.fn(),
    findByIds: jest.fn(),
    findByOwnerId: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
    findAll: jest.fn(),
  });

  it('returns the station when it exists', async () => {
    const stationRepository = buildStationRepository();
    const service = new GetStationByIdService(stationRepository);
    const station = WeatherStation.create({
      id: 'station-1',
      name: 'Central',
      location: Location.create(-34.6037, -58.3816),
      sensorModel: 'WH-1080',
      ownerId: 'user-1',
    });

    stationRepository.findById.mockResolvedValue(station);

    await expect(
      service.execute({
        stationId: 'station-1',
      }),
    ).resolves.toBe(station);
  });

  it('rejects missing stations', async () => {
    const stationRepository = buildStationRepository();
    const service = new GetStationByIdService(stationRepository);

    stationRepository.findById.mockResolvedValue(null);

    await expect(
      service.execute({
        stationId: 'missing',
      }),
    ).rejects.toThrow('Station not found');
  });
});
