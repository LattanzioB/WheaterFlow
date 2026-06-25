import { ListAllStationsService } from './list-all-stations.service';
import { IStationRepository } from '../../domain/ports/station-repository.port';
import { WeatherProviderCode } from '../../domain/value-objects/weather-provider.value-object';

describe('ListAllStationsService', () => {
  it('returns every available station with optional name filtering', async () => {
    const stationRepository: jest.Mocked<IStationRepository> = {
      findById: jest.fn(),
      findByIds: jest.fn(),
      findByOwnerId: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      findAll: jest.fn(),
      findWithFilters: jest.fn(),
    };
    const stations = [{ getId: () => 'station-1' }] as any[];
    const service = new ListAllStationsService(stationRepository);

    stationRepository.findWithFilters.mockResolvedValue(stations as any);

    await expect(
      service.execute({
        name: ' North ',
        provider: WeatherProviderCode.OPENWEATHER,
      }),
    ).resolves.toBe(stations);
    expect(stationRepository.findWithFilters).toHaveBeenCalledWith({
      name: 'North',
      provider: WeatherProviderCode.OPENWEATHER,
    });
  });
});
