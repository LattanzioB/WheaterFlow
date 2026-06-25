import { WeatherDataProviderInvalidPayloadError } from '../../domain/errors/weather-data-provider.errors';
import type { WeatherDataReading } from '../../domain/ports/weather-data-provider.port';

type OpenWeatherCurrentPayload = {
  id: number | string;
  dt: number;
  main: {
    temp: number;
    humidity: number;
    pressure: number;
  };
};

export class OpenWeatherMapResponseMapper {
  map(payload: unknown): WeatherDataReading {
    if (!this.isRecord(payload)) {
      throw new WeatherDataProviderInvalidPayloadError(
        'response must be an object',
      );
    }

    const main = payload.main;
    if (!this.isRecord(main)) {
      throw new WeatherDataProviderInvalidPayloadError(
        'main must be an object',
      );
    }

    const candidate: OpenWeatherCurrentPayload = {
      id: payload.id as number | string,
      dt: payload.dt as number,
      main: {
        temp: main.temp as number,
        humidity: main.humidity as number,
        pressure: main.pressure as number,
      },
    };

    this.assertExternalId(candidate.id);
    this.assertFiniteNumber(candidate.main.temp, 'main.temp');
    this.assertFiniteNumber(candidate.main.humidity, 'main.humidity');
    this.assertFiniteNumber(candidate.main.pressure, 'main.pressure');
    this.assertFiniteNumber(candidate.dt, 'dt');

    if (candidate.main.humidity < 0 || candidate.main.humidity > 100) {
      throw new WeatherDataProviderInvalidPayloadError(
        'main.humidity must be between 0 and 100',
      );
    }

    if (candidate.main.pressure <= 0) {
      throw new WeatherDataProviderInvalidPayloadError(
        'main.pressure must be greater than zero',
      );
    }

    if (candidate.dt <= 0) {
      throw new WeatherDataProviderInvalidPayloadError(
        'dt must be a positive Unix timestamp',
      );
    }

    const observedAt = new Date(candidate.dt * 1_000);
    if (Number.isNaN(observedAt.getTime())) {
      throw new WeatherDataProviderInvalidPayloadError(
        'dt must represent a valid date',
      );
    }

    return {
      externalId: String(candidate.id),
      temperature: {
        value: candidate.main.temp,
        unit: 'celsius',
      },
      humidity: {
        value: candidate.main.humidity,
        unit: 'percent',
      },
      pressure: {
        value: candidate.main.pressure,
        unit: 'hPa',
      },
      observedAt,
    };
  }

  private assertExternalId(value: unknown): asserts value is number | string {
    const isValidNumber = typeof value === 'number' && Number.isFinite(value);
    const isValidString = typeof value === 'string' && value.trim().length > 0;

    if (!isValidNumber && !isValidString) {
      throw new WeatherDataProviderInvalidPayloadError(
        'id must be a finite number or non-empty string',
      );
    }
  }

  private assertFiniteNumber(
    value: unknown,
    field: string,
  ): asserts value is number {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new WeatherDataProviderInvalidPayloadError(
        `${field} must be a finite number`,
      );
    }
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}
