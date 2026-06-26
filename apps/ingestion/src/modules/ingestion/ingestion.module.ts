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
import { ApiMeasurementSubmitterAdapter } from './infrastructure/adapters/api-measurement-submitter.adapter';
import {
  ApiWeatherStationCatalogAdapter,
  WEATHERFLOW_API_HTTP_CLIENT_TOKEN,
} from './infrastructure/adapters/api-weather-station-catalog.adapter';
import {
  OPENWEATHER_HTTP_CLIENT_TOKEN,
  OPENWEATHER_TIMEOUT_MS_TOKEN,
  OpenWeatherMapAdapter,
} from './infrastructure/adapters/openweathermap.adapter';
import { OpenWeatherMapResponseMapper } from './infrastructure/adapters/openweathermap-response.mapper';
import { HealthController } from './infrastructure/http/health.controller';
import { IngestionController } from './infrastructure/http/ingestion.controller';
import { ManualIngestionTokenGuard } from './infrastructure/http/manual-ingestion-token.guard';
import { IngestionScheduler } from './infrastructure/scheduling/ingestion.scheduler';

@Module({
  imports: [ConfigModule, ScheduleModule.forRoot()],
  controllers: [HealthController, IngestionController],
  providers: [
    OpenWeatherMapResponseMapper,
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
      provide: WEATHER_DATA_PROVIDER_TOKEN,
      useClass: OpenWeatherMapAdapter,
    },
    {
      provide: WEATHERFLOW_API_HTTP_CLIENT_TOKEN,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        axios.create({
          baseURL: configService.getOrThrow<string>('api.baseUrl'),
          timeout: 10_000,
          headers: {
            'x-ingestion-token':
              configService.getOrThrow<string>('api.systemToken'),
          },
        }),
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
