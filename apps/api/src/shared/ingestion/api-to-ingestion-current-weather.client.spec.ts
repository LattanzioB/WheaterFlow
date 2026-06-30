import { AxiosError, type AxiosInstance } from 'axios';
import { HttpBoundaryMetrics } from '@shared/resilience/http-boundary.metrics';
import {
  ApiToIngestionBulkheadRejectedError,
  ApiToIngestionCircuitOpenError,
  ApiToIngestionCurrentWeatherClient,
  ApiToIngestionTimeoutError,
  mapApiToIngestionErrorToHttpStatus,
} from './api-to-ingestion-current-weather.client';

describe('ApiToIngestionCurrentWeatherClient', () => {
  const reading = {
    externalId: '3435910',
    temperature: { value: 18.4, unit: 'celsius' as const },
    humidity: { value: 63, unit: 'percent' as const },
    pressure: { value: 1017, unit: 'hPa' as const },
    observedAt: '2026-06-26T12:00:00.000Z',
  };

  const query = { latitude: -34.706, longitude: -58.278 };

  const buildClient = (
    httpClient: AxiosInstance,
    options?: {
      bulkheadLimit?: number;
      failureThreshold?: number;
      retryAttempts?: number;
      retryBaseDelayMs?: number;
      metrics?: HttpBoundaryMetrics;
    },
  ): ApiToIngestionCurrentWeatherClient =>
    new ApiToIngestionCurrentWeatherClient(
      httpClient,
      options?.bulkheadLimit ?? 10,
      options?.failureThreshold ?? 3,
      30_000,
      options?.retryAttempts ?? 1,
      options?.retryBaseDelayMs ?? 0,
      options?.metrics ?? new HttpBoundaryMetrics(),
    );

  it('requests current weather by coordinates and maps the normalized reading', async () => {
    const httpClient = {
      get: jest.fn().mockResolvedValue({ status: 200, data: reading }),
    } as unknown as AxiosInstance;
    const client = buildClient(httpClient);

    await expect(client.getCurrentWeather(query)).resolves.toEqual(reading);
    expect(httpClient.get).toHaveBeenCalledWith('/internal/weather/current', {
      params: query,
    });
  });

  it('uses one conservative retry for safe transient read-path failures', async () => {
    const httpClient = {
      get: jest
        .fn()
        .mockResolvedValueOnce({ status: 504, data: { message: 'timeout' } })
        .mockResolvedValueOnce({ status: 200, data: reading }),
    } as unknown as AxiosInstance;
    const metrics = new HttpBoundaryMetrics();
    const client = buildClient(httpClient, { metrics });

    await expect(client.getCurrentWeather(query)).resolves.toEqual(reading);

    expect(httpClient.get).toHaveBeenCalledTimes(2);
    expect(metrics.renderPrometheus()).toContain(
      'weatherflow_http_boundary_requests_total{direction="api_to_ingestion",outcome="retry"} 1',
    );
  });

  it('does not retry definitive ingestion failures', async () => {
    const httpClient = {
      get: jest.fn().mockResolvedValue({ status: 400, data: {} }),
    } as unknown as AxiosInstance;
    const client = buildClient(httpClient);

    await expect(client.getCurrentWeather(query)).rejects.toMatchObject({
      status: 400,
      retryable: false,
    });
    expect(httpClient.get).toHaveBeenCalledTimes(1);
  });

  it('rejects requests beyond the API read-path bulkhead limit', async () => {
    let releaseRequest!: () => void;
    const httpClient = {
      get: jest.fn(
        () =>
          new Promise((resolve) => {
            releaseRequest = () =>
              resolve({
                status: 200,
                data: reading,
              });
          }),
      ),
    } as unknown as AxiosInstance;
    const metrics = new HttpBoundaryMetrics();
    const client = buildClient(httpClient, { bulkheadLimit: 1, metrics });

    const firstRequest = client.getCurrentWeather(query);
    await expect(client.getCurrentWeather(query)).rejects.toBeInstanceOf(
      ApiToIngestionBulkheadRejectedError,
    );
    releaseRequest();
    await firstRequest;
    expect(metrics.renderPrometheus()).toContain(
      'weatherflow_http_boundary_requests_total{direction="api_to_ingestion",outcome="bulkhead_rejected"} 1',
    );
  });

  it('opens the read-path circuit after repeated timeouts', async () => {
    const httpClient = {
      get: jest
        .fn()
        .mockRejectedValue(new AxiosError('timeout', 'ECONNABORTED')),
    } as unknown as AxiosInstance;
    const metrics = new HttpBoundaryMetrics();
    const client = buildClient(httpClient, {
      failureThreshold: 1,
      retryAttempts: 0,
      metrics,
    });

    await expect(client.getCurrentWeather(query)).rejects.toBeInstanceOf(
      ApiToIngestionTimeoutError,
    );
    await expect(client.getCurrentWeather(query)).rejects.toBeInstanceOf(
      ApiToIngestionCircuitOpenError,
    );
    expect(metrics.renderPrometheus()).toContain(
      'weatherflow_http_boundary_breaker_state{direction="api_to_ingestion",state="open"} 1',
    );
  });

  it('maps internal boundary failures to clear public HTTP statuses', () => {
    expect(
      mapApiToIngestionErrorToHttpStatus(new ApiToIngestionTimeoutError()),
    ).toBe(504);
    expect(
      mapApiToIngestionErrorToHttpStatus(
        new ApiToIngestionCircuitOpenError(new Date()),
      ),
    ).toBe(503);
    expect(mapApiToIngestionErrorToHttpStatus(new Error('boom'))).toBe(502);
  });
});
