import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { AxiosInstance } from 'axios';
import { WEATHER_DATA_PROVIDER_TOKEN } from './domain/ports/weather-data-provider.port';
import { IngestionModule } from './ingestion.module';
import ingestionConfiguration from './infrastructure/config/ingestion.configuration';
import {
  OPENWEATHER_HTTP_CLIENT_TOKEN,
  OpenWeatherMapAdapter,
} from './infrastructure/adapters/openweathermap.adapter';
import { WEATHERFLOW_API_HTTP_CLIENT_TOKEN } from './infrastructure/adapters/api-weather-station-catalog.adapter';
import {
  OPENWEATHER_RAW_PROVIDER_TOKEN,
  ResilientWeatherDataProvider,
} from './infrastructure/resilience/resilient-weather-data-provider';

describe('IngestionModule', () => {
  const originalEnv = process.env;

  beforeAll(() => {
    process.env = {
      ...originalEnv,
      OWM_API_KEY: 'test-api-key',
      OWM_BASE_URL: 'https://api.openweathermap.org',
      OWM_TIMEOUT_MS: '5000',
      OWM_CACHE_TTL_MS: '300000',
      OWM_BREAKER_FAILURE_THRESHOLD: '3',
      OWM_BREAKER_OPEN_MS: '30000',
      API_BASE_URL: 'http://localhost:3000',
      API_TIMEOUT_MS: '7500',
      API_BREAKER_FAILURE_THRESHOLD: '3',
      API_BREAKER_OPEN_MS: '30000',
      API_RETRY_ATTEMPTS: '2',
      API_RETRY_BASE_DELAY_MS: '250',
      INGESTION_SYSTEM_TOKEN: 'test-ingestion-system-token',
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('exports WeatherDataProvider as an injectable OpenWeather adapter', async () => {
    const testingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          load: [ingestionConfiguration],
        }),
        IngestionModule,
      ],
    }).compile();

    expect(testingModule.get(WEATHER_DATA_PROVIDER_TOKEN)).toBeInstanceOf(
      ResilientWeatherDataProvider,
    );
    expect(testingModule.get(OPENWEATHER_RAW_PROVIDER_TOKEN)).toBeInstanceOf(
      OpenWeatherMapAdapter,
    );

    const httpClient = testingModule.get<AxiosInstance>(
      OPENWEATHER_HTTP_CLIENT_TOKEN,
    );

    expect(httpClient.defaults).toMatchObject({
      baseURL: 'https://api.openweathermap.org',
      timeout: 5_000,
      params: {
        appid: 'test-api-key',
      },
    });

    const apiHttpClient = testingModule.get<AxiosInstance>(
      WEATHERFLOW_API_HTTP_CLIENT_TOKEN,
    );
    expect(apiHttpClient.defaults).toMatchObject({
      baseURL: 'http://localhost:3000',
      timeout: 7_500,
      headers: expect.objectContaining({
        'x-ingestion-token': 'test-ingestion-system-token',
      }),
    });
  });
});
