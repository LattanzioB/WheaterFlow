import { createHash } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import type { AxiosInstance } from 'axios';
import type {
  MeasurementSubmitter,
  SubmitMeasurementCommand,
  SubmittedMeasurement,
} from '../../domain/ports/measurement-submitter.port';
import { WEATHERFLOW_API_HTTP_CLIENT_TOKEN } from './api-weather-station-catalog.adapter';

type ApiMeasurementPayload = {
  id?: unknown;
  stationId?: unknown;
  source?: unknown;
  reportedAt?: unknown;
  alertStatus?: unknown;
  alertType?: unknown;
};

@Injectable()
export class ApiMeasurementSubmitterAdapter implements MeasurementSubmitter {
  constructor(
    @Inject(WEATHERFLOW_API_HTTP_CLIENT_TOKEN)
    private readonly httpClient: AxiosInstance,
  ) {}

  async submitMeasurement(
    command: SubmitMeasurementCommand,
  ): Promise<SubmittedMeasurement> {
    const response = await this.httpClient.post<unknown>(
      '/internal/ingestion/measurements',
      {
        stationId: command.stationId,
        temperature: command.reading.temperature.value,
        humidity: command.reading.humidity.value,
        pressure: command.reading.pressure.value,
        reportedAt: command.reading.observedAt.toISOString(),
        source: 'openweather',
        idempotencyKey: this.buildIdempotencyKey(command),
      },
      {
        headers: {
          'x-correlation-id': command.correlationId,
        },
      },
    );

    return this.mapMeasurement(response.data);
  }

  private buildIdempotencyKey(command: SubmitMeasurementCommand): string {
    return createHash('sha256')
      .update(
        [
          'openweather',
          command.stationId,
          command.reading.externalId,
          command.reading.observedAt.toISOString(),
        ].join(':'),
      )
      .digest('hex');
  }

  private mapMeasurement(payload: unknown): SubmittedMeasurement {
    if (!payload || typeof payload !== 'object') {
      throw new Error('WeatherFlow API returned an invalid measurement');
    }

    const measurement = payload as ApiMeasurementPayload;

    if (
      typeof measurement.id !== 'string' ||
      typeof measurement.stationId !== 'string' ||
      measurement.source !== 'openweather' ||
      typeof measurement.reportedAt !== 'string' ||
      typeof measurement.alertStatus !== 'boolean' ||
      typeof measurement.alertType !== 'string'
    ) {
      throw new Error('WeatherFlow API returned an invalid measurement');
    }

    return {
      id: measurement.id,
      stationId: measurement.stationId,
      source: measurement.source,
      reportedAt: measurement.reportedAt,
      alertStatus: measurement.alertStatus,
      alertType: measurement.alertType,
    };
  }
}
