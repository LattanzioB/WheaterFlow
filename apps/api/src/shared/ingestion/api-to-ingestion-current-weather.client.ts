import { Inject, Injectable } from '@nestjs/common';
import { AxiosError, type AxiosInstance, type AxiosResponse } from 'axios';
import { HttpBoundaryMetrics } from '@shared/resilience/http-boundary.metrics';
import type {
  CurrentWeatherLocationQuery,
  CurrentWeatherReadingResponse,
} from '@contracts';

export const API_TO_INGESTION_HTTP_CLIENT_TOKEN = 'ApiToIngestionHttpClient';
export const API_TO_INGESTION_BULKHEAD_LIMIT_TOKEN =
  'ApiToIngestionBulkheadLimit';
export const API_TO_INGESTION_BREAKER_FAILURE_THRESHOLD_TOKEN =
  'ApiToIngestionBreakerFailureThreshold';
export const API_TO_INGESTION_BREAKER_OPEN_MS_TOKEN =
  'ApiToIngestionBreakerOpenMs';
export const API_TO_INGESTION_RETRY_ATTEMPTS_TOKEN =
  'ApiToIngestionRetryAttempts';
export const API_TO_INGESTION_RETRY_BASE_DELAY_MS_TOKEN =
  'ApiToIngestionRetryBaseDelayMs';

type IngestionCurrentWeatherPayload = {
  externalId?: unknown;
  temperature?: {
    value?: unknown;
    unit?: unknown;
  };
  humidity?: {
    value?: unknown;
    unit?: unknown;
  };
  pressure?: {
    value?: unknown;
    unit?: unknown;
  };
  observedAt?: unknown;
};

type CircuitState = 'closed' | 'open' | 'half_open';

export class ApiToIngestionBoundaryError extends Error {
  constructor(
    message: string,
    public readonly retryable: boolean,
    public readonly status?: number,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class ApiToIngestionTimeoutError extends ApiToIngestionBoundaryError {
  constructor() {
    super('Ingestion service request timed out', true, 504);
  }
}

export class ApiToIngestionCircuitOpenError extends ApiToIngestionBoundaryError {
  constructor(openedUntil: Date) {
    super(
      `Ingestion service circuit breaker is open until ${openedUntil.toISOString()}`,
      false,
      503,
    );
  }
}

export class ApiToIngestionBulkheadRejectedError extends ApiToIngestionBoundaryError {
  constructor(concurrencyLimit: number) {
    super(
      `Ingestion service bulkhead rejected the request at concurrency limit ${concurrencyLimit}`,
      false,
      503,
    );
  }
}

export function mapApiToIngestionErrorToHttpStatus(
  error: unknown,
): 502 | 503 | 504 {
  if (error instanceof ApiToIngestionTimeoutError) {
    return 504;
  }

  if (
    error instanceof ApiToIngestionCircuitOpenError ||
    error instanceof ApiToIngestionBulkheadRejectedError
  ) {
    return 503;
  }

  if (error instanceof ApiToIngestionBoundaryError) {
    if (error.status === 504) {
      return 504;
    }

    if (error.status === 429 || error.status === 503) {
      return 503;
    }
  }

  return 502;
}

@Injectable()
export class ApiToIngestionCurrentWeatherClient {
  private activeRequests = 0;
  private failures = 0;
  private circuitState: CircuitState = 'closed';
  private openedAt: Date | null = null;
  private halfOpenProbeInFlight = false;

  constructor(
    @Inject(API_TO_INGESTION_HTTP_CLIENT_TOKEN)
    private readonly httpClient: AxiosInstance,
    @Inject(API_TO_INGESTION_BULKHEAD_LIMIT_TOKEN)
    private readonly bulkheadLimit: number,
    @Inject(API_TO_INGESTION_BREAKER_FAILURE_THRESHOLD_TOKEN)
    private readonly failureThreshold: number,
    @Inject(API_TO_INGESTION_BREAKER_OPEN_MS_TOKEN)
    private readonly breakerOpenMs: number,
    @Inject(API_TO_INGESTION_RETRY_ATTEMPTS_TOKEN)
    private readonly retryAttempts: number,
    @Inject(API_TO_INGESTION_RETRY_BASE_DELAY_MS_TOKEN)
    private readonly retryBaseDelayMs: number,
    private readonly metrics: HttpBoundaryMetrics,
  ) {}

  async getCurrentWeather(
    query: CurrentWeatherLocationQuery,
  ): Promise<CurrentWeatherReadingResponse> {
    const response = await this.executeWithResilience(() =>
      this.httpClient.get<unknown>('/internal/weather/current', {
        params: {
          latitude: query.latitude,
          longitude: query.longitude,
        },
      }),
    );

    return this.mapReading(response.data);
  }

  private async executeWithResilience(
    request: () => Promise<AxiosResponse<unknown>>,
  ): Promise<AxiosResponse<unknown>> {
    this.rejectWhenBulkheadIsFull();
    this.activeRequests += 1;

    try {
      this.assertCircuitAllowsRequest();

      for (let attempt = 0; attempt <= this.retryAttempts; attempt += 1) {
        this.metrics.recordRequest('api_to_ingestion', 'attempt');

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

          this.metrics.recordRequest('api_to_ingestion', 'retry');
          await this.sleep(this.backoffDelayMs(attempt));
        }
      }
    } finally {
      this.activeRequests -= 1;
      if (this.circuitState === 'half_open') {
        this.halfOpenProbeInFlight = false;
      }
    }

    throw new ApiToIngestionBoundaryError(
      'Ingestion service request failed',
      false,
    );
  }

  private ensureSuccessfulResponse(response: AxiosResponse<unknown>): void {
    if (response.status >= 200 && response.status < 300) {
      return;
    }

    throw new ApiToIngestionBoundaryError(
      `Ingestion service request failed with status ${response.status}`,
      this.isRetryableStatus(response.status),
      response.status,
    );
  }

  private rejectWhenBulkheadIsFull(): void {
    if (this.activeRequests < this.bulkheadLimit) {
      return;
    }

    this.metrics.recordRequest('api_to_ingestion', 'bulkhead_rejected');
    throw new ApiToIngestionBulkheadRejectedError(this.bulkheadLimit);
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
    this.metrics.setBreakerState('api_to_ingestion', this.circuitState);
  }

  private rejectOpenCircuit(openedUntil?: Date): never {
    this.metrics.recordRequest('api_to_ingestion', 'circuit_open');
    throw new ApiToIngestionCircuitOpenError(
      openedUntil ?? new Date(Date.now() + this.breakerOpenMs),
    );
  }

  private recordSuccess(): void {
    this.failures = 0;
    this.circuitState = 'closed';
    this.openedAt = null;
    this.metrics.setBreakerState('api_to_ingestion', this.circuitState);
    this.metrics.recordRequest('api_to_ingestion', 'success');
  }

  private recordFailure(error: ApiToIngestionBoundaryError): void {
    this.metrics.recordRequest('api_to_ingestion', 'failure');

    if (
      error instanceof ApiToIngestionCircuitOpenError ||
      error instanceof ApiToIngestionBulkheadRejectedError
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
    this.metrics.setBreakerState('api_to_ingestion', this.circuitState);
  }

  private normalizeError(error: unknown): ApiToIngestionBoundaryError {
    if (error instanceof ApiToIngestionBoundaryError) {
      return error;
    }

    if (error instanceof AxiosError) {
      const status = error.response?.status;
      if (status !== undefined) {
        return new ApiToIngestionBoundaryError(
          `Ingestion service request failed with status ${status}`,
          this.isRetryableStatus(status),
          status,
        );
      }

      if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
        return new ApiToIngestionTimeoutError();
      }

      return new ApiToIngestionBoundaryError(
        'Ingestion service network request failed',
        true,
      );
    }

    return new ApiToIngestionBoundaryError(
      error instanceof Error ? error.message : String(error),
      false,
    );
  }

  private mapReading(payload: unknown): CurrentWeatherReadingResponse {
    if (!payload || typeof payload !== 'object') {
      throw new ApiToIngestionBoundaryError(
        'Ingestion service returned an invalid weather reading',
        false,
      );
    }

    const reading = payload as IngestionCurrentWeatherPayload;

    if (
      typeof reading.externalId !== 'string' ||
      typeof reading.temperature?.value !== 'number' ||
      reading.temperature.unit !== 'celsius' ||
      typeof reading.humidity?.value !== 'number' ||
      reading.humidity.unit !== 'percent' ||
      typeof reading.pressure?.value !== 'number' ||
      reading.pressure.unit !== 'hPa' ||
      typeof reading.observedAt !== 'string'
    ) {
      throw new ApiToIngestionBoundaryError(
        'Ingestion service returned an invalid weather reading',
        false,
      );
    }

    return {
      externalId: reading.externalId,
      temperature: {
        value: reading.temperature.value,
        unit: 'celsius',
      },
      humidity: {
        value: reading.humidity.value,
        unit: 'percent',
      },
      pressure: {
        value: reading.pressure.value,
        unit: 'hPa',
      },
      observedAt: reading.observedAt,
    };
  }

  private isRetryableStatus(status: number): boolean {
    return [429, 502, 503, 504].includes(status);
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
}
