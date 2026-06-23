import { IStationRepository } from '../../domain/ports/station-repository.port';
import {
  UpdateStationCommand,
  UpdateStationService,
} from './update-station.service';
import { WeatherStation } from '../../domain/entities/weather-station.entity';
import { Location } from '../../domain/value-objects/location.value-object';
import { StationStatus } from '../../domain/value-objects/station-status.enum';
import { WeatherProviderCode } from '../../domain/value-objects/weather-provider.value-object';

describe('UpdateStationService', () => {
  const buildStationRepository = (): jest.Mocked<IStationRepository> => ({
    findById: jest.fn(),
    findByIds: jest.fn(),
    findByOwnerId: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
    findAll: jest.fn(),
  });

  const buildStation = () =>
    WeatherStation.create({
      id: 'station-1',
      name: 'Central',
      location: Location.create(-34.6037, -58.3816),
      sensorModel: 'WH-1080',
      ownerId: 'user-1',
    });

  it('updates mutable station fields and persists the aggregate', async () => {
    const stationRepository = buildStationRepository();
    const service = new UpdateStationService(stationRepository);
    const station = buildStation();
    const command: UpdateStationCommand = {
      stationId: 'station-1',
      name: 'South',
      location: {
        latitude: -33.0,
        longitude: -57.0,
      },
      sensorModel: 'AWS-3000',
      status: StationStatus.INACTIVE,
      provider: WeatherProviderCode.OPENWEATHER,
      alertSettings: {
        extremeHeat: false,
        frost: false,
      },
    };

    stationRepository.findById.mockResolvedValue(station);

    const result = await service.execute(command);

    expect(stationRepository.findById.mock.calls).toEqual([['station-1']]);
    expect(stationRepository.save.mock.calls).toHaveLength(1);
    expect(result.getName()).toBe('South');
    expect(result.getLocation().equals(Location.create(-33.0, -57.0))).toBe(
      true,
    );
    expect(result.getSensorModel()).toBe('AWS-3000');
    expect(result.getStatus()).toBe(StationStatus.INACTIVE);
    expect(result.getProvider().getValue()).toBe(
      WeatherProviderCode.OPENWEATHER,
    );
    expect(result.getAlertSettings().toPrimitives()).toEqual({
      extremeHeat: false,
      frost: false,
      storm: true,
      criticalHumidity: true,
    });
  });

  it('rejects updates for unknown stations', async () => {
    const stationRepository = buildStationRepository();
    const service = new UpdateStationService(stationRepository);

    stationRepository.findById.mockResolvedValue(null);

    await expect(
      service.execute({
        stationId: 'missing',
        name: 'South',
      }),
    ).rejects.toThrow('Station not found');
    expect(stationRepository.save.mock.calls).toHaveLength(0);
  });
});
