import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import axios from 'axios';
import {
  OWM_CONCURRENCY_LIMIT_TOKEN,
  RunIngestionCycleService,
} from './application/services/run-ingestion-cycle.service';
import { WEATHER_DATA_PROVIDER_TOKEN } from './domain/ports/weather-data-provider.port';
import { WEATHER_STATION_CATALOG_TOKEN } from './domain/ports/weather-station-catalog.port';
import { MEASUREMENT_SUBMITTER_TOKEN } from './domain/ports/measurement-submitter.port';
import {
  ApiMeasurementSubmitterAdapter,
  WEATHERFLOW_API_BREAKER_FAILURE_THRESHOLD_TOKEN,
  WEATHERFLOW_API_BREAKER_OPEN_MS_TOKEN,
  WEATHERFLOW_API_BULKHEAD_LIMIT_TOKEN,
  WEATHERFLOW_API_RETRY_ATTEMPTS_TOKEN,
  WEATHERFLOW_API_RETRY_BASE_DELAY_MS_TOKEN,
} from './infrastructure/adapters/api-measurement-submitter.adapter';
import {
  ApiWeatherStationCatalogAdapter,
  WEATHERFLOW_API_HTTP_CLIENT_TOKEN,
} from './infrastructure/adapters/api-weather-station-catalog.adapter';
import { HttpBoundaryMetrics } from '@shared/resilience/http-boundary.metrics';
import { MetricsService } from '@shared/observability';
import {
  OPENWEATHER_HTTP_CLIENT_TOKEN,
  OPENWEATHER_TIMEOUT_MS_TOKEN,
  OpenWeatherMapAdapter,
} from './infrastructure/adapters/openweathermap.adapter';
import { OpenWeatherMapResponseMapper } from './infrastructure/adapters/openweathermap-response.mapper';
import { HealthController } from './infrastructure/http/health.controller';
import { CurrentWeatherController } from './infrastructure/http/current-weather.controller';
import { IngestionController } from './infrastructure/http/ingestion.controller';
import { ManualIngestionTokenGuard } from './infrastructure/http/manual-ingestion-token.guard';
import { IngestionMetrics } from './infrastructure/metrics/ingestion.metrics';
import { OpenWeatherResilienceMetrics } from './infrastructure/resilience/openweather-resilience.metrics';
import {
  OPENWEATHER_BREAKER_FAILURE_THRESHOLD_TOKEN,
  OPENWEATHER_BREAKER_OPEN_MS_TOKEN,
  OPENWEATHER_BULKHEAD_LIMIT_TOKEN,
  OPENWEATHER_CACHE_TTL_MS_TOKEN,
  OPENWEATHER_RAW_PROVIDER_TOKEN,
  ResilientWeatherDataProvider,
} from './infrastructure/resilience/resilient-weather-data-provider';
import { IngestionScheduler } from './infrastructure/scheduling/ingestion.scheduler';

@Module({
  imports: [ConfigModule, ScheduleModule.forRoot()],
  controllers: [HealthController, IngestionController, CurrentWeatherController],
  providers: [
    OpenWeatherMapResponseMapper,
    {
      provide: OpenWeatherResilienceMetrics,
      inject: [{ token: MetricsService, optional: true }],
      useFactory: (metrics?: MetricsService): OpenWeatherResilienceMetrics =>
        new OpenWeatherResilienceMetrics(metrics?.registry),
    },
    {
      provide: HttpBoundaryMetrics,
      inject: [{ token: MetricsService, optional: true }],
      useFactory: (metrics?: MetricsService): HttpBoundaryMetrics =>
        new HttpBoundaryMetrics(metrics?.registry),
    },
    {
      provide: IngestionMetrics,
      inject: [{ token: MetricsService, optional: true }],
      useFactory: (metrics?: MetricsService): IngestionMetrics =>
        new IngestionMetrics(metrics?.registry),
    },
    RunIngestionCycleService,
    IngestionScheduler,
    ManualIngestionTokenGuard,
    {
      provide: OWM_CONCURRENCY_LIMIT_TOKEN,
      inject: [ConfigService],
      useFactory: (configService: ConfigService): number =>
        configService.get<number>('openWeather.concurrencyLimit') ?? 3,
    },
    {
      provide: OPENWEATHER_TIMEOUT_MS_TOKEN,
      inject: [ConfigService],
      useFactory: (configService: ConfigService): number =>
        configService.get<number>('openWeather.timeoutMs') ?? 10_000,
    },
    {
      provide: OPENWEATHER_CACHE_TTL_MS_TOKEN,
      inject: [ConfigService],
      useFactory: (configService: ConfigService): number =>
        configService.get<number>('openWeather.cacheTtlMs') ?? 300_000,
    },
    {
      provide: OPENWEATHER_BREAKER_FAILURE_THRESHOLD_TOKEN,
      inject: [ConfigService],
      useFactory: (configService: ConfigService): number =>
        configService.get<number>('openWeather.breakerFailureThreshold') ?? 3,
    },
    {
      provide: OPENWEATHER_BREAKER_OPEN_MS_TOKEN,
      inject: [ConfigService],
      useFactory: (configService: ConfigService): number =>
        configService.get<number>('openWeather.breakerOpenMs') ?? 30_000,
    },
    {
      provide: OPENWEATHER_BULKHEAD_LIMIT_TOKEN,
      inject: [ConfigService],
      useFactory: (configService: ConfigService): number =>
        configService.get<number>('openWeather.concurrencyLimit') ?? 3,
    },
    {
      provide: OPENWEATHER_HTTP_CLIENT_TOKEN,
      inject: [ConfigService, OPENWEATHER_TIMEOUT_MS_TOKEN],
      useFactory: (configService: ConfigService, timeout: number) =>
        axios.create({
          baseURL: configService.getOrThrow<string>('openWeather.baseUrl'),
          timeout,
          validateStatus: () => true,
          params: {
            appid: configService.getOrThrow<string>('openWeather.apiKey'),
          },
        }),
    },
    {
      provide: OPENWEATHER_RAW_PROVIDER_TOKEN,
      useClass: OpenWeatherMapAdapter,
    },
    {
      provide: WEATHER_DATA_PROVIDER_TOKEN,
      useClass: ResilientWeatherDataProvider,
    },
    {
      provide: WEATHERFLOW_API_HTTP_CLIENT_TOKEN,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        axios.create({
          baseURL: configService.getOrThrow<string>('api.baseUrl'),
          timeout: configService.get<number>('api.timeoutMs') ?? 10_000,
          validateStatus: () => true,
          headers: {
            'x-ingestion-token':
              configService.getOrThrow<string>('api.systemToken'),
          },
        }),
    },
    {
      provide: WEATHERFLOW_API_BULKHEAD_LIMIT_TOKEN,
      inject: [ConfigService],
      useFactory: (configService: ConfigService): number =>
        configService.get<number>('api.concurrencyLimit') ?? 3,
    },
    {
      provide: WEATHERFLOW_API_BREAKER_FAILURE_THRESHOLD_TOKEN,
      inject: [ConfigService],
      useFactory: (configService: ConfigService): number =>
        configService.get<number>('api.breakerFailureThreshold') ?? 3,
    },
    {
      provide: WEATHERFLOW_API_BREAKER_OPEN_MS_TOKEN,
      inject: [ConfigService],
      useFactory: (configService: ConfigService): number =>
        configService.get<number>('api.breakerOpenMs') ?? 30_000,
    },
    {
      provide: WEATHERFLOW_API_RETRY_ATTEMPTS_TOKEN,
      inject: [ConfigService],
      useFactory: (configService: ConfigService): number =>
        configService.get<number>('api.retryAttempts') ?? 2,
    },
    {
      provide: WEATHERFLOW_API_RETRY_BASE_DELAY_MS_TOKEN,
      inject: [ConfigService],
      useFactory: (configService: ConfigService): number =>
        configService.get<number>('api.retryBaseDelayMs') ?? 250,
    },
    {
      provide: WEATHER_STATION_CATALOG_TOKEN,
      useClass: ApiWeatherStationCatalogAdapter,
    },
    {
      provide: MEASUREMENT_SUBMITTER_TOKEN,
      useClass: ApiMeasurementSubmitterAdapter,
    },
  ],
  exports: [WEATHER_DATA_PROVIDER_TOKEN, RunIngestionCycleService],
})
export class IngestionModule {}
