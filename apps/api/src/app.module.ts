import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { EventEmitterModule } from '@nestjs/event-emitter';
import axios from 'axios';
import { HttpBoundaryMetrics } from '@shared/resilience/http-boundary.metrics';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { MeasurementsModule } from './modules/measurements/measurements.module';
import { StationsModule } from './modules/stations/stations.module';
import { UsersModule } from './modules/users/users.module';
import configuration from '@shared/config/configuration';
import { envValidationSchema } from '@shared/config/env-validation';
import { DefaultStationsBootstrap } from './shared/seeds/default-stations.bootstrap';
import {
  API_TO_INGESTION_BREAKER_FAILURE_THRESHOLD_TOKEN,
  API_TO_INGESTION_BREAKER_OPEN_MS_TOKEN,
  API_TO_INGESTION_BULKHEAD_LIMIT_TOKEN,
  API_TO_INGESTION_HTTP_CLIENT_TOKEN,
  API_TO_INGESTION_RETRY_ATTEMPTS_TOKEN,
  API_TO_INGESTION_RETRY_BASE_DELAY_MS_TOKEN,
  ApiToIngestionCurrentWeatherClient,
} from './shared/ingestion/api-to-ingestion-current-weather.client';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema: envValidationSchema,
      validationOptions: {
        abortEarly: false,
      },
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.getOrThrow<string>('database.uri'),
        retryAttempts: 3,
        retryDelay: 1000,
        lazyConnection: process.env.NODE_ENV === 'test',
      }),
    }),
    EventEmitterModule.forRoot(),
    AuthModule,
    UsersModule,
    StationsModule,
    MeasurementsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    DefaultStationsBootstrap,
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
})
export class AppModule {}
