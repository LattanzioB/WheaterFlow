import { Inject, Injectable } from '@nestjs/common';
import type { AxiosInstance } from 'axios';
import type {
  IngestionStation,
  WeatherStationCatalog,
} from '../../domain/ports/weather-station-catalog.port';

export const WEATHERFLOW_API_HTTP_CLIENT_TOKEN = 'WeatherFlowApiHttpClient';

type ApiStationPayload = {
  id?: unknown;
  name?: unknown;
  location?: {
    latitude?: unknown;
    longitude?: unknown;
  };
  status?: unknown;
  provider?: unknown;
};

@Injectable()
export class ApiWeatherStationCatalogAdapter implements WeatherStationCatalog {
  constructor(
    @Inject(WEATHERFLOW_API_HTTP_CLIENT_TOKEN)
    private readonly httpClient: AxiosInstance,
  ) {}

  async listOpenWeatherStations(): Promise<IngestionStation[]> {
    const response = await this.httpClient.get<unknown>(
      '/internal/ingestion/stations',
    );

    if (!Array.isArray(response.data)) {
      throw new Error('WeatherFlow API returned an invalid station list');
    }

    return response.data.map((payload) => this.mapStation(payload));
  }

  private mapStation(payload: unknown): IngestionStation {
    if (!payload || typeof payload !== 'object') {
      throw new Error('WeatherFlow API returned an invalid station');
    }

    const station = payload as ApiStationPayload;
    const latitude = station.location?.latitude;
    const longitude = station.location?.longitude;

    if (
      typeof station.id !== 'string' ||
      typeof station.name !== 'string' ||
      typeof latitude !== 'number' ||
      typeof longitude !== 'number' ||
      (station.status !== 'Activa' && station.status !== 'Inactiva') ||
      station.provider !== 'openweather'
    ) {
      throw new Error('WeatherFlow API returned an invalid station');
    }

    return {
      id: station.id,
      name: station.name,
      location: { latitude, longitude },
      status: station.status,
      provider: station.provider,
    };
  }
}
