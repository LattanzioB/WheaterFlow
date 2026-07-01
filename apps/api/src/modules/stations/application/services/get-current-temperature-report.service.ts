import { Injectable } from '@nestjs/common';
import type { CurrentTemperatureReportResponse } from '@contracts';
import { ApiToIngestionCurrentWeatherClient } from '../../../../shared/ingestion/api-to-ingestion-current-weather.client';
import { WeatherProviderCode } from '../../domain/value-objects/weather-provider.value-object';
import { GetStationByIdService } from './get-station-by-id.service';

export interface GetCurrentTemperatureReportCommand {
  stationId: string;
}

export class UnsupportedCurrentTemperatureProviderError extends Error {
  constructor(provider: WeatherProviderCode) {
    super(`Current temperature reports require provider openweather, got ${provider}`);
    this.name = 'UnsupportedCurrentTemperatureProviderError';
  }
}

@Injectable()
export class GetCurrentTemperatureReportService {
  constructor(
    private readonly getStationByIdService: GetStationByIdService,
    private readonly currentWeatherClient: ApiToIngestionCurrentWeatherClient,
  ) {}

  async execute(
    command: GetCurrentTemperatureReportCommand,
  ): Promise<CurrentTemperatureReportResponse> {
    const station = await this.getStationByIdService.execute({
      stationId: command.stationId,
    });

    const provider = station.getProvider().getValue();
    if (provider !== WeatherProviderCode.OPENWEATHER) {
      throw new UnsupportedCurrentTemperatureProviderError(provider);
    }

    const location = station.getLocation();
    const reading = await this.currentWeatherClient.getCurrentWeather({
      latitude: location.getLatitude(),
      longitude: location.getLongitude(),
    });

    return {
      station: {
        id: station.getId(),
        name: station.getName(),
      },
      temperature: reading.temperature,
      observedAt: reading.observedAt,
      fetchedAt: new Date().toISOString(),
    };
  }
}
