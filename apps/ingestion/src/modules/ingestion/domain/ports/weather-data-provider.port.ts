export const WEATHER_DATA_PROVIDER_TOKEN = 'WeatherDataProvider';

export type WeatherLocation = {
  latitude: number;
  longitude: number;
};

export type WeatherDataReading = {
  externalId: string;
  temperature: {
    value: number;
    unit: 'celsius';
  };
  humidity: {
    value: number;
    unit: 'percent';
  };
  pressure: {
    value: number;
    unit: 'hPa';
  };
  observedAt: Date;
};

export type CachedWeatherDataReading = {
  reading: WeatherDataReading;
  cachedAt: Date;
  ageMs: number;
  ttlMs: number;
};

export interface WeatherDataProvider {
  getCurrentWeather(location: WeatherLocation): Promise<WeatherDataReading>;
}

export interface WeatherDataProviderCache {
  getCachedReading(location: WeatherLocation): CachedWeatherDataReading | null;
}

export function supportsWeatherDataProviderCache(
  provider: WeatherDataProvider,
): provider is WeatherDataProvider & WeatherDataProviderCache {
  return (
    typeof (provider as Partial<WeatherDataProviderCache>).getCachedReading ===
    'function'
  );
}
