import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import axios from 'axios';
import { WEATHER_DATA_PROVIDER_TOKEN } from './domain/ports/weather-data-provider.port';
import {
  OPENWEATHER_HTTP_CLIENT_TOKEN,
  OPENWEATHER_TIMEOUT_MS_TOKEN,
  OpenWeatherMapAdapter,
} from './infrastructure/adapters/openweathermap.adapter';
import { OpenWeatherMapResponseMapper } from './infrastructure/adapters/openweathermap-response.mapper';
import { HealthController } from './infrastructure/http/health.controller';

@Module({
  imports: [ConfigModule],
  controllers: [HealthController],
  providers: [
    OpenWeatherMapResponseMapper,
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
  ],
  exports: [WEATHER_DATA_PROVIDER_TOKEN],
})
export class IngestionModule {}
