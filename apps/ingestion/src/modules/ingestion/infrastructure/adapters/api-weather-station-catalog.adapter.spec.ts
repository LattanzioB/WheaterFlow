import type { AxiosInstance } from 'axios';
import { ApiWeatherStationCatalogAdapter } from './api-weather-station-catalog.adapter';

describe('ApiWeatherStationCatalogAdapter', () => {
  it('loads and maps OpenWeather stations from the API', async () => {
    const httpClient = {
      get: jest.fn().mockResolvedValue({
        data: [
          {
            id: 'station-1',
            name: 'UNQ',
            location: { latitude: -34.7067, longitude: -58.2775 },
            status: 'ACTIVE',
            provider: 'openweather',
          },
        ],
      }),
    } as unknown as AxiosInstance;
    const adapter = new ApiWeatherStationCatalogAdapter(httpClient);

    await expect(adapter.listOpenWeatherStations()).resolves.toEqual([
      {
        id: 'station-1',
        name: 'UNQ',
        location: { latitude: -34.7067, longitude: -58.2775 },
        status: 'ACTIVE',
        provider: 'openweather',
      },
    ]);
    expect(httpClient.get).toHaveBeenCalledWith('/internal/ingestion/stations');
  });

  it('rejects malformed station contracts', async () => {
    const httpClient = {
      get: jest.fn().mockResolvedValue({
        data: [{ id: 'station-1', provider: 'none' }],
      }),
    } as unknown as AxiosInstance;
    const adapter = new ApiWeatherStationCatalogAdapter(httpClient);

    await expect(adapter.listOpenWeatherStations()).rejects.toThrow(
      'invalid station',
    );
  });
});
