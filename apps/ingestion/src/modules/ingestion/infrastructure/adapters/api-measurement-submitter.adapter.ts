import { createHash } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { AxiosError, type AxiosInstance, type AxiosResponse } from 'axios';
import { HttpBoundaryMetrics } from '@shared/resilience/http-boundary.metrics';
import type {
  MeasurementSubmitter,
  SubmitMeasurementCommand,
  SubmittedMeasurement,
} from '../../domain/ports/measurement-submitter.port';
import { WEATHERFLOW_API_HTTP_CLIENT_TOKEN } from './api-weather-station-catalog.adapter';

export const WEATHERFLOW_API_BULKHEAD_LIMIT_TOKEN =
  'WeatherFlowApiBulkheadLimit';
export const WEATHERFLOW_API_BREAKER_FAILURE_THRESHOLD_TOKEN =
  'WeatherFlowApiBreakerFailureThreshold';
export const WEATHERFLOW_API_BREAKER_OPEN_MS_TOKEN =
  'WeatherFlowApiBreakerOpenMs';
export const WEATHERFLOW_API_RETRY_ATTEMPTS_TOKEN =
  'WeatherFlowApiRetryAttempts';
export const WEATHERFLOW_API_RETRY_BASE_DELAY_MS_TOKEN =
  'WeatherFlowApiRetryBaseDelayMs';

type ApiMeasurementPayload = {
  id?: unknown;
  stationId?: unknown;
  source?: unknown;
  reportedAt?: unknown;
  alertStatus?: unknown;
  alertType?: unknown;
};

type ApiMeasurementRequest = {
  stationId: string;
  temperature: number;
  humidity: number;
  pressure: number;
  reportedAt: string;
  source: 'openweather';
  idempotencyKey: string;
};

type CircuitState = 'closed' | 'open' | 'half_open';

export class WeatherFlowApiBoundaryError extends Error {
  constructor(
    message: string,
    public readonly retryable: boolean,
    public readonly status?: number,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class WeatherFlowApiCircuitOpenError extends WeatherFlowApiBoundaryError {
  constructor(openedUntil: Date) {
    super(
      `WeatherFlow API circuit breaker is open until ${openedUntil.toISOString()}`,
      false,
    );
  }
}

export class WeatherFlowApiBulkheadRejectedError extends WeatherFlowApiBoundaryError {
  constructor(concurrencyLimit: number) {
    super(
      `WeatherFlow API bulkhead rejected the request at concurrency limit ${concurrencyLimit}`,
      false,
    );
  }
}

@Injectable()
export class ApiMeasurementSubmitterAdapter implements MeasurementSubmitter {
  private activeRequests = 0;
  private failures = 0;
  private circuitState: CircuitState = 'closed';
  private openedAt: Date | null = null;
  private halfOpenProbeInFlight = false;

  constructor(
    @Inject(WEATHERFLOW_API_HTTP_CLIENT_TOKEN)
    private readonly httpClient: AxiosInstance,
    @Inject(WEATHERFLOW_API_BULKHEAD_LIMIT_TOKEN)
    private readonly bulkheadLimit: number,
    @Inject(WEATHERFLOW_API_BREAKER_FAILURE_THRESHOLD_TOKEN)
    private readonly failureThreshold: number,
    @Inject(WEATHERFLOW_API_BREAKER_OPEN_MS_TOKEN)
    private readonly breakerOpenMs: number,
    @Inject(WEATHERFLOW_API_RETRY_ATTEMPTS_TOKEN)
    private readonly retryAttempts: number,
    @Inject(WEATHERFLOW_API_RETRY_BASE_DELAY_MS_TOKEN)
    private readonly retryBaseDelayMs: number,
    private readonly metrics: HttpBoundaryMetrics,
  ) {}

  async submitMeasurement(
    command: SubmitMeasurementCommand,
  ): Promise<SubmittedMeasurement> {
    const body: ApiMeasurementRequest = {
      stationId: command.stationId,
      temperature: command.reading.temperature.value,
      humidity: command.reading.humidity.value,
      pressure: command.reading.pressure.value,
      reportedAt: command.reading.observedAt.toISOString(),
      source: 'openweather',
      idempotencyKey: this.buildIdempotencyKey(command),
    };

    const response = await this.executeWithResilience(() =>
      this.httpClient.post<unknown>('/internal/ingestion/measurements', body, {
        headers: {
          'x-correlation-id': command.correlationId,
        },
      }),
    );

    return this.mapMeasurement(response.data);
  }

  private async executeWithResilience(
    request: () => Promise<AxiosResponse<unknown>>,
  ): Promise<AxiosResponse<unknown>> {
    this.rejectWhenBulkheadIsFull();
    this.activeRequests += 1;

    try {
      this.assertCircuitAllowsRequest();

      for (let attempt = 0; attempt <= this.retryAttempts; attempt += 1) {
        this.metrics.recordRequest('ingestion_to_api', 'attempt');

        try {
          const response = await request();
          this.ensureSuccessfulResponse(response);
          this.recordSuccess();
          return response;
        } catch (error: unknown) {
          const normalizedError = this.normalizeError(error);
          const shouldRetry =
            attempt < this.retryAttempts && normalizedError.retryable;

          if (!shouldRetry) {
            this.recordFailure(normalizedError);
            throw normalizedError;
          }

          this.metrics.recordRequest('ingestion_to_api', 'retry');
          await this.sleep(this.backoffDelayMs(attempt));
        }
      }
    } finally {
      this.activeRequests -= 1;
      if (this.circuitState === 'half_open') {
        this.halfOpenProbeInFlight = false;
      }
    }

    throw new WeatherFlowApiBoundaryError(
      'WeatherFlow API request failed',
      false,
    );
  }

  private ensureSuccessfulResponse(response: AxiosResponse<unknown>): void {
    if (response.status >= 200 && response.status < 300) {
      return;
    }

    throw new WeatherFlowApiBoundaryError(
      `WeatherFlow API request failed with status ${response.status}`,
      this.isRetryableStatus(response.status),
      response.status,
    );
  }

  private rejectWhenBulkheadIsFull(): void {
    if (this.activeRequests < this.bulkheadLimit) {
      return;
    }

    this.metrics.recordRequest('ingestion_to_api', 'bulkhead_rejected');
    throw new WeatherFlowApiBulkheadRejectedError(this.bulkheadLimit);
  }

  private assertCircuitAllowsRequest(): void {
    if (this.circuitState !== 'open') {
      if (this.circuitState === 'half_open') {
        if (this.halfOpenProbeInFlight) {
          this.rejectOpenCircuit();
        }

        this.halfOpenProbeInFlight = true;
      }
      return;
    }

    const openedAt = this.openedAt ?? new Date();
    const openedUntil = new Date(openedAt.getTime() + this.breakerOpenMs);
    if (Date.now() < openedUntil.getTime()) {
      this.rejectOpenCircuit(openedUntil);
    }

    this.circuitState = 'half_open';
    this.halfOpenProbeInFlight = true;
    this.metrics.setBreakerState('ingestion_to_api', this.circuitState);
  }

  private rejectOpenCircuit(openedUntil?: Date): never {
    this.metrics.recordRequest('ingestion_to_api', 'circuit_open');
    throw new WeatherFlowApiCircuitOpenError(
      openedUntil ?? new Date(Date.now() + this.breakerOpenMs),
    );
  }

  private recordSuccess(): void {
    this.failures = 0;
    this.circuitState = 'closed';
    this.openedAt = null;
    this.metrics.setBreakerState('ingestion_to_api', this.circuitState);
    this.metrics.recordRequest('ingestion_to_api', 'success');
  }

  private recordFailure(error: WeatherFlowApiBoundaryError): void {
    this.metrics.recordRequest('ingestion_to_api', 'failure');

    if (
      error instanceof WeatherFlowApiCircuitOpenError ||
      error instanceof WeatherFlowApiBulkheadRejectedError
    ) {
      return;
    }

    if (this.circuitState === 'half_open') {
      this.openCircuit();
      return;
    }

    this.failures += 1;
    if (this.failures >= this.failureThreshold) {
      this.openCircuit();
    }
  }

  private openCircuit(): void {
    this.circuitState = 'open';
    this.openedAt = new Date();
    this.halfOpenProbeInFlight = false;
    this.metrics.setBreakerState('ingestion_to_api', this.circuitState);
  }

  private normalizeError(error: unknown): WeatherFlowApiBoundaryError {
    if (error instanceof WeatherFlowApiBoundaryError) {
      return error;
    }

    if (error instanceof AxiosError) {
      const status = error.response?.status;
      if (status !== undefined) {
        return new WeatherFlowApiBoundaryError(
          `WeatherFlow API request failed with status ${status}`,
          this.isRetryableStatus(status),
          status,
        );
      }

      return new WeatherFlowApiBoundaryError(
        'WeatherFlow API network request failed',
        this.isRetryableNetworkError(error),
      );
    }

    return new WeatherFlowApiBoundaryError(
      error instanceof Error ? error.message : String(error),
      false,
    );
  }

  private isRetryableStatus(status: number): boolean {
    return [429, 502, 503, 504].includes(status);
  }

  private isRetryableNetworkError(error: AxiosError): boolean {
    return (
      error.response === undefined &&
      (error.code === undefined ||
        [
          'ECONNABORTED',
          'ETIMEDOUT',
          'ECONNRESET',
          'ENOTFOUND',
          'EAI_AGAIN',
        ].includes(error.code))
    );
  }

  private backoffDelayMs(attempt: number): number {
    const exponentialDelay = this.retryBaseDelayMs * 2 ** attempt;
    const jitter = Math.floor(Math.random() * this.retryBaseDelayMs);
    return exponentialDelay + jitter;
  }

  private async sleep(delayMs: number): Promise<void> {
    if (delayMs <= 0) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, delayMs));
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
