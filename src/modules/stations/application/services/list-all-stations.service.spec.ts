import { ListAllStationsService } from './list-all-stations.service';
import { IStationRepository } from '../ports/station-repository.port';

describe('ListAllStationsService', () => {
  it('returns every available station', async () => {
    const stationRepository: jest.Mocked<IStationRepository> = {
      findById: jest.fn(),
      findByIds: jest.fn(),
      findByOwnerId: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      findAll: jest.fn(),
    };
    const stations = [{ getId: () => 'station-1' }] as any[];
    const service = new ListAllStationsService(stationRepository);

    stationRepository.findAll.mockResolvedValue(stations as any);

    await expect(service.execute()).resolves.toBe(stations);
    expect(stationRepository.findAll).toHaveBeenCalledTimes(1);
  });
});
