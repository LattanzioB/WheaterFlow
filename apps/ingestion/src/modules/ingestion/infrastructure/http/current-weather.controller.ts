import {
  BadGatewayException,
  Controller,
  Get,
  GatewayTimeoutException,
  Inject,
  Query,
  ServiceUnavailableException,
  UseGuards,
} from '@nestjs/common';
import type { CurrentWeatherReadingResponse } from '@contracts';
import {
  WeatherDataProviderBulkheadRejectedError,
  WeatherDataProviderCircuitOpenError,
  WeatherDataProviderError,
  WeatherDataProviderTimeoutError,
  WeatherDataProviderUnavailableError,
} from '../../domain/errors/weather-data-provider.errors';
import {
  WEATHER_DATA_PROVIDER_TOKEN,
  type WeatherDataProvider,
} from '../../domain/ports/weather-data-provider.port';
import { CurrentWeatherQueryDto } from './current-weather.dto';
import { ManualIngestionTokenGuard } from './manual-ingestion-token.guard';

@Controller('internal/weather')
export class CurrentWeatherController {
  constructor(
    @Inject(WEATHER_DATA_PROVIDER_TOKEN)
    private readonly weatherDataProvider: WeatherDataProvider,
  ) {}

  @Get('current')
  @UseGuards(ManualIngestionTokenGuard)
  async getCurrentWeather(
    @Query() query: CurrentWeatherQueryDto,
  ): Promise<CurrentWeatherReadingResponse> {
    try {
      const reading = await this.weatherDataProvider.getCurrentWeather({
        latitude: query.latitude,
        longitude: query.longitude,
      });

      return {
        externalId: reading.externalId,
        temperature: reading.temperature,
        humidity: reading.humidity,
        pressure: reading.pressure,
        observedAt: reading.observedAt.toISOString(),
      };
    } catch (error: unknown) {
      throw this.mapProviderError(error);
    }
  }

  private mapProviderError(error: unknown): Error {
    if (error instanceof WeatherDataProviderTimeoutError) {
      return new GatewayTimeoutException('OpenWeather request timed out');
    }

    if (
      error instanceof WeatherDataProviderCircuitOpenError ||
      error instanceof WeatherDataProviderBulkheadRejectedError ||
      error instanceof WeatherDataProviderUnavailableError
    ) {
      return new ServiceUnavailableException(
        'OpenWeather is temporarily unavailable',
      );
    }

    if (error instanceof WeatherDataProviderError) {
      return new BadGatewayException('OpenWeather returned an invalid response');
    }

    return new BadGatewayException('Unable to fetch current weather');
  }
}
