import { IStationRepository } from '../../domain/ports/station-repository.port';
import {
  DeleteStationCommand,
  DeleteStationService,
} from './delete-station.service';
import { WeatherStation } from '../../domain/entities/weather-station.entity';
import { Location } from '../../domain/value-objects/location.value-object';

describe('DeleteStationService', () => {
  const command: DeleteStationCommand = {
    stationId: 'station-1',
  };

  const buildStationRepository = (): jest.Mocked<IStationRepository> => ({
    findById: jest.fn(),
    findByIds: jest.fn(),
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
    ownerId: 'user-1',
  });

  it('deletes an existing station', async () => {
    const stationRepository = buildStationRepository();
    const service = new DeleteStationService(stationRepository);

    stationRepository.findById.mockResolvedValue(station);

    await service.execute(command);

    expect(stationRepository.findById.mock.calls).toEqual([['station-1']]);
    expect(stationRepository.delete.mock.calls).toEqual([['station-1']]);
  });

  it('rejects deleting an unknown station', async () => {
    const stationRepository = buildStationRepository();
    const service = new DeleteStationService(stationRepository);

    stationRepository.findById.mockResolvedValue(null);

    await expect(service.execute(command)).rejects.toThrow('Station not found');
    expect(stationRepository.delete.mock.calls).toHaveLength(0);
  });
});
