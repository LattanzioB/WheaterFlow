import { createHash } from 'node:crypto';
import { AxiosError, type AxiosInstance } from 'axios';
import { HttpBoundaryMetrics } from '@shared/resilience/http-boundary.metrics';
import {
  ApiMeasurementSubmitterAdapter,
  WeatherFlowApiBulkheadRejectedError,
  WeatherFlowApiCircuitOpenError,
} from './api-measurement-submitter.adapter';

describe('ApiMeasurementSubmitterAdapter', () => {
  const buildAdapter = (
    httpClient: AxiosInstance,
    options?: {
      bulkheadLimit?: number;
      failureThreshold?: number;
      retryAttempts?: number;
      retryBaseDelayMs?: number;
      metrics?: HttpBoundaryMetrics;
    },
  ): ApiMeasurementSubmitterAdapter =>
    new ApiMeasurementSubmitterAdapter(
      httpClient,
      options?.bulkheadLimit ?? 3,
      options?.failureThreshold ?? 3,
      30_000,
      options?.retryAttempts ?? 2,
      options?.retryBaseDelayMs ?? 0,
      options?.metrics ?? new HttpBoundaryMetrics(),
    );

  const command = {
    stationId: 'station-1',
    correlationId: 'cycle-1',
    reading: {
      externalId: 'owm-3435910',
      temperature: { value: 41, unit: 'celsius' as const },
      humidity: { value: 65, unit: 'percent' as const },
      pressure: { value: 1005, unit: 'hPa' as const },
      observedAt: new Date('2026-06-25T12:00:00.000Z'),
    },
  };

  it('submits an OpenWeather reading with deterministic idempotency and correlation', async () => {
    const httpClient = {
      post: jest.fn().mockResolvedValue({
        status: 200,
        data: {
          id: 'measurement-1',
          stationId: 'station-1',
          source: 'openweather',
          reportedAt: '2026-06-25T12:00:00.000Z',
          alertStatus: true,
          alertType: 'Calor Extremo',
        },
      }),
    } as unknown as AxiosInstance;
    const adapter = buildAdapter(httpClient);

    await expect(adapter.submitMeasurement(command)).resolves.toMatchObject({
      id: 'measurement-1',
      source: 'openweather',
      alertStatus: true,
    });

    const idempotencyKey = createHash('sha256')
      .update('openweather:station-1:owm-3435910:2026-06-25T12:00:00.000Z')
      .digest('hex');
    expect(httpClient.post).toHaveBeenCalledWith(
      '/internal/ingestion/measurements',
      {
        stationId: 'station-1',
        temperature: 41,
        humidity: 65,
        pressure: 1005,
        reportedAt: '2026-06-25T12:00:00.000Z',
        source: 'openweather',
        idempotencyKey,
      },
      {
        headers: {
          'x-correlation-id': 'cycle-1',
        },
      },
    );
  });

  it('rejects malformed API measurement responses', async () => {
    const httpClient = {
      post: jest
        .fn()
        .mockResolvedValue({ status: 200, data: { source: 'manual' } }),
    } as unknown as AxiosInstance;
    const adapter = buildAdapter(httpClient);

    await expect(adapter.submitMeasurement(command)).rejects.toThrow(
      'invalid measurement',
    );
  });

  it('retries safe transient API failures with the same idempotent payload', async () => {
    const httpClient = {
      post: jest
        .fn()
        .mockResolvedValueOnce({ status: 503, data: { message: 'busy' } })
        .mockResolvedValueOnce({
          status: 200,
          data: {
            id: 'measurement-1',
            stationId: 'station-1',
            source: 'openweather',
            reportedAt: '2026-06-25T12:00:00.000Z',
            alertStatus: false,
            alertType: 'Ninguna',
          },
        }),
    } as unknown as AxiosInstance;
    const metrics = new HttpBoundaryMetrics();
    const adapter = buildAdapter(httpClient, { metrics });

    await expect(adapter.submitMeasurement(command)).resolves.toMatchObject({
      id: 'measurement-1',
    });

    expect(httpClient.post).toHaveBeenCalledTimes(2);
    expect(httpClient.post).toHaveBeenNthCalledWith(
      2,
      '/internal/ingestion/measurements',
      expect.objectContaining({
        idempotencyKey: createHash('sha256')
          .update('openweather:station-1:owm-3435910:2026-06-25T12:00:00.000Z')
          .digest('hex'),
      }),
      expect.any(Object),
    );
    expect(await metrics.registry.metrics()).toContain(
      'weatherflow_http_boundary_requests_total{direction="ingestion_to_api",outcome="retry"} 1',
    );
  });

  it('does not retry definitive API validation failures', async () => {
    const httpClient = {
      post: jest.fn().mockResolvedValue({ status: 400, data: {} }),
    } as unknown as AxiosInstance;
    const adapter = buildAdapter(httpClient);

    await expect(adapter.submitMeasurement(command)).rejects.toMatchObject({
      status: 400,
      retryable: false,
    });
    expect(httpClient.post).toHaveBeenCalledTimes(1);
  });

  it('rejects requests beyond the API bulkhead limit', async () => {
    let releaseRequest!: () => void;
    const httpClient = {
      post: jest.fn(
        () =>
          new Promise((resolve) => {
            releaseRequest = () =>
              resolve({
                status: 200,
                data: {
                  id: 'measurement-1',
                  stationId: 'station-1',
                  source: 'openweather',
                  reportedAt: '2026-06-25T12:00:00.000Z',
                  alertStatus: false,
                  alertType: 'Ninguna',
                },
              });
          }),
      ),
    } as unknown as AxiosInstance;
    const metrics = new HttpBoundaryMetrics();
    const adapter = buildAdapter(httpClient, { bulkheadLimit: 1, metrics });

    const firstRequest = adapter.submitMeasurement(command);
    await expect(adapter.submitMeasurement(command)).rejects.toBeInstanceOf(
      WeatherFlowApiBulkheadRejectedError,
    );
    releaseRequest();
    await firstRequest;
    expect(await metrics.registry.metrics()).toContain(
      'weatherflow_http_boundary_requests_total{direction="ingestion_to_api",outcome="bulkhead_rejected"} 1',
    );
  });

  it('opens the circuit after repeated network failures', async () => {
    const httpClient = {
      post: jest
        .fn()
        .mockRejectedValue(new AxiosError('timeout', 'ECONNABORTED')),
    } as unknown as AxiosInstance;
    const metrics = new HttpBoundaryMetrics();
    const adapter = buildAdapter(httpClient, {
      failureThreshold: 1,
      retryAttempts: 0,
      metrics,
    });

    await expect(adapter.submitMeasurement(command)).rejects.toMatchObject({
      retryable: true,
    });
    await expect(adapter.submitMeasurement(command)).rejects.toBeInstanceOf(
      WeatherFlowApiCircuitOpenError,
    );
    expect(await metrics.registry.metrics()).toContain(
      'weatherflow_http_boundary_breaker_state{direction="ingestion_to_api",state="open"} 1',
    );
  });
});
