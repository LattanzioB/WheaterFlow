import { ApiToIngestionCurrentWeatherClient } from '../../../../shared/ingestion/api-to-ingestion-current-weather.client';
import { StationStatus } from '../../domain/value-objects/station-status.enum';
import { WeatherProviderCode } from '../../domain/value-objects/weather-provider.value-object';
import { GetStationByIdService } from './get-station-by-id.service';
import {
  GetCurrentTemperatureReportService,
  UnsupportedCurrentTemperatureProviderError,
} from './get-current-temperature-report.service';

describe('GetCurrentTemperatureReportService', () => {
  const buildStation = (provider = WeatherProviderCode.OPENWEATHER) => ({
    getId: () => 'station-1',
    getName: () => 'Buenos Aires',
    getLocation: () => ({
      getLatitude: () => -34.6037,
      getLongitude: () => -58.3816,
    }),
    getProvider: () => ({
      getValue: () => provider,
    }),
    getStatus: () => StationStatus.ACTIVE,
  });

  const buildService = () => {
    const getStationByIdService = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetStationByIdService>;
    const currentWeatherClient = {
      getCurrentWeather: jest.fn(),
    } as unknown as jest.Mocked<ApiToIngestionCurrentWeatherClient>;
    const service = new GetCurrentTemperatureReportService(
      getStationByIdService,
      currentWeatherClient,
    );

    return { service, getStationByIdService, currentWeatherClient };
  };

  it('delegates OpenWeather stations to ingestion by coordinates', async () => {
    const { service, getStationByIdService, currentWeatherClient } =
      buildService();
    getStationByIdService.execute.mockResolvedValue(buildStation() as any);
    currentWeatherClient.getCurrentWeather.mockResolvedValue({
      externalId: '3435910',
      temperature: { value: 18.4, unit: 'celsius' },
      humidity: { value: 63, unit: 'percent' },
      pressure: { value: 1017, unit: 'hPa' },
      observedAt: '2026-06-26T12:00:00.000Z',
    });

    await expect(
      service.execute({ stationId: 'station-1' }),
    ).resolves.toMatchObject({
      station: { id: 'station-1', name: 'Buenos Aires' },
      temperature: { value: 18.4, unit: 'celsius' },
      observedAt: '2026-06-26T12:00:00.000Z',
    });
    expect(currentWeatherClient.getCurrentWeather).toHaveBeenCalledWith({
      latitude: -34.6037,
      longitude: -58.3816,
    });
  });

  it('rejects stations that are not backed by OpenWeather', async () => {
    const { service, getStationByIdService, currentWeatherClient } =
      buildService();
    getStationByIdService.execute.mockResolvedValue(
      buildStation(WeatherProviderCode.NONE) as any,
    );

    await expect(
      service.execute({ stationId: 'station-1' }),
    ).rejects.toBeInstanceOf(UnsupportedCurrentTemperatureProviderError);
    expect(currentWeatherClient.getCurrentWeather).not.toHaveBeenCalled();
  });
});
