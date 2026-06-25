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

export interface WeatherDataProvider {
  getCurrentWeather(location: WeatherLocation): Promise<WeatherDataReading>;
}
