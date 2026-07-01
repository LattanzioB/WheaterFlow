import type { WeatherLocation } from './weather-data-provider.port';

export const WEATHER_STATION_CATALOG_TOKEN = 'WeatherStationCatalog';

export type IngestionStationStatus = 'ACTIVE' | 'INACTIVE';

export type IngestionStation = {
  id: string;
  name: string;
  location: WeatherLocation;
  status: IngestionStationStatus;
  provider: 'openweather';
};

export interface WeatherStationCatalog {
  listOpenWeatherStations(): Promise<IngestionStation[]>;
}
