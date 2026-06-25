import { ListAllStationsService } from '../../application/services/list-all-stations.service';
import { StationStatus } from '../../domain/value-objects/station-status.enum';
import { WeatherProviderCode } from '../../domain/value-objects/weather-provider.value-object';
import { InternalIngestionStationsController } from './internal-ingestion-stations.controller';

describe('InternalIngestionStationsController', () => {
  it('lists only OpenWeather stations through the application service', async () => {
    const listAllStationsService = {
      execute: jest.fn().mockResolvedValue([
        {
          getId: () => 'station-1',
          getName: () => 'UNQ',
          getLocation: () => ({
            getLatitude: () => -34.7067,
            getLongitude: () => -58.2775,
          }),
          getSensorModel: () => 'OpenWeatherMap',
          getStatus: () => StationStatus.ACTIVE,
          getOwnerId: () => 'system-owner',
          getProvider: () => ({
            getValue: () => WeatherProviderCode.OPENWEATHER,
          }),
          getAlertSettings: () => ({
            toPrimitives: () => ({
              extremeHeat: true,
              frost: true,
              storm: true,
              criticalHumidity: true,
            }),
          }),
          getCreatedAt: () => new Date('2026-06-21T12:00:00.000Z'),
        },
      ]),
    } as unknown as jest.Mocked<ListAllStationsService>;
    const controller = new InternalIngestionStationsController(
      listAllStationsService,
    );

    await expect(controller.listOpenWeatherStations()).resolves.toEqual([
      expect.objectContaining({
        id: 'station-1',
        provider: WeatherProviderCode.OPENWEATHER,
      }),
    ]);
    expect(listAllStationsService.execute).toHaveBeenCalledWith({
      provider: WeatherProviderCode.OPENWEATHER,
    });
  });
});
