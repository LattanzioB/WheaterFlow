import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { HttpBoundaryMetrics } from '@shared/resilience/http-boundary.metrics';
import {
  API_TO_INGESTION_BREAKER_FAILURE_THRESHOLD_TOKEN,
  API_TO_INGESTION_BREAKER_OPEN_MS_TOKEN,
  API_TO_INGESTION_BULKHEAD_LIMIT_TOKEN,
  API_TO_INGESTION_HTTP_CLIENT_TOKEN,
  API_TO_INGESTION_RETRY_ATTEMPTS_TOKEN,
  API_TO_INGESTION_RETRY_BASE_DELAY_MS_TOKEN,
  ApiToIngestionCurrentWeatherClient,
} from './api-to-ingestion-current-weather.client';

@Global()
@Module({
  providers: [
    HttpBoundaryMetrics,
    ApiToIngestionCurrentWeatherClient,
    {
      provide: API_TO_INGESTION_HTTP_CLIENT_TOKEN,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        axios.create({
          baseURL: configService.getOrThrow<string>('ingestion.serviceUrl'),
          timeout: configService.get<number>('ingestion.timeoutMs') ?? 5_000,
          validateStatus: () => true,
          headers: {
            'x-ingestion-token': configService.getOrThrow<string>(
              'ingestion.systemToken',
            ),
          },
        }),
    },
    {
      provide: API_TO_INGESTION_BULKHEAD_LIMIT_TOKEN,
      inject: [ConfigService],
      useFactory: (configService: ConfigService): number =>
        configService.get<number>('ingestion.concurrencyLimit') ?? 10,
    },
    {
      provide: API_TO_INGESTION_BREAKER_FAILURE_THRESHOLD_TOKEN,
      inject: [ConfigService],
      useFactory: (configService: ConfigService): number =>
        configService.get<number>('ingestion.breakerFailureThreshold') ?? 3,
    },
    {
      provide: API_TO_INGESTION_BREAKER_OPEN_MS_TOKEN,
      inject: [ConfigService],
      useFactory: (configService: ConfigService): number =>
        configService.get<number>('ingestion.breakerOpenMs') ?? 30_000,
    },
    {
      provide: API_TO_INGESTION_RETRY_ATTEMPTS_TOKEN,
      inject: [ConfigService],
      useFactory: (configService: ConfigService): number =>
        configService.get<number>('ingestion.retryAttempts') ?? 1,
    },
    {
      provide: API_TO_INGESTION_RETRY_BASE_DELAY_MS_TOKEN,
      inject: [ConfigService],
      useFactory: (configService: ConfigService): number =>
        configService.get<number>('ingestion.retryBaseDelayMs') ?? 100,
    },
  ],
  exports: [HttpBoundaryMetrics, ApiToIngestionCurrentWeatherClient],
})
export class ApiIngestionModule {}
