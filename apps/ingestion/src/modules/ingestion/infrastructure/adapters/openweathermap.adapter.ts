import { Inject, Injectable } from '@nestjs/common';
import axios, { type AxiosInstance, type AxiosResponse } from 'axios';
import {
  WeatherDataProviderHttpError,
  WeatherDataProviderTimeoutError,
  WeatherDataProviderUnavailableError,
} from '../../domain/errors/weather-data-provider.errors';
import type {
  WeatherDataProvider,
  WeatherDataReading,
  WeatherLocation,
} from '../../domain/ports/weather-data-provider.port';
import { OpenWeatherMapResponseMapper } from './openweathermap-response.mapper';

export const OPENWEATHER_HTTP_CLIENT_TOKEN = 'OpenWeatherHttpClient';
export const OPENWEATHER_TIMEOUT_MS_TOKEN = 'OpenWeatherTimeoutMs';

@Injectable()
export class OpenWeatherMapAdapter implements WeatherDataProvider {
  constructor(
    @Inject(OPENWEATHER_HTTP_CLIENT_TOKEN)
    private readonly httpClient: AxiosInstance,
    @Inject(OPENWEATHER_TIMEOUT_MS_TOKEN)
    private readonly timeoutMs: number,
    private readonly responseMapper: OpenWeatherMapResponseMapper,
  ) {}

  async getCurrentWeather(
    location: WeatherLocation,
  ): Promise<WeatherDataReading> {
    let response: AxiosResponse<unknown>;

    try {
      response = await this.httpClient.get<unknown>('/data/2.5/weather', {
        params: {
          lat: location.latitude,
          lon: location.longitude,
          units: 'metric',
        },
      });
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
          throw new WeatherDataProviderTimeoutError(this.timeoutMs, {
            cause: error,
          });
        }

        if (error.response) {
          throw new WeatherDataProviderHttpError(
            error.response.status,
            error.response.data,
          );
        }
      }

      throw new WeatherDataProviderUnavailableError({ cause: error });
    }

    if (response.status < 200 || response.status >= 300) {
      throw new WeatherDataProviderHttpError(response.status, response.data);
    }

    return this.responseMapper.map(response.data);
  }
}
