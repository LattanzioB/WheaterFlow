import {
  WeatherDataProviderBulkheadRejectedError,
  WeatherDataProviderCircuitOpenError,
  WeatherDataProviderTimeoutError,
} from '../../domain/errors/weather-data-provider.errors';
import type { WeatherDataProvider } from '../../domain/ports/weather-data-provider.port';
import { OpenWeatherResilienceMetrics } from './openweather-resilience.metrics';
import { ResilientWeatherDataProvider } from './resilient-weather-data-provider';

const location = { latitude: -34.6037, longitude: -58.3816 };
const reading = {
  externalId: '3435910',
  temperature: { value: 18.42, unit: 'celsius' as const },
  humidity: { value: 63, unit: 'percent' as const },
  pressure: { value: 1017, unit: 'hPa' as const },
  observedAt: new Date('2024-06-21T14:00:00.000Z'),
};

describe('ResilientWeatherDataProvider', () => {
  let delegate: jest.Mocked<WeatherDataProvider>;
  let metrics: OpenWeatherResilienceMetrics;

  beforeEach(() => {
    delegate = {
      getCurrentWeather: jest.fn(),
    };
    metrics = new OpenWeatherResilienceMetrics();
  });

  it('caches successful readings and exposes fresh cache hits with age', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-06-25T12:00:00.000Z'));
    delegate.getCurrentWeather.mockResolvedValue(reading);
    const provider = buildProvider();

    await expect(provider.getCurrentWeather(location)).resolves.toBe(reading);
    jest.setSystemTime(new Date('2026-06-25T12:00:05.000Z'));

    expect(provider.getCachedReading(location)).toEqual({
      reading,
      cachedAt: new Date('2026-06-25T12:00:00.000Z'),
      ageMs: 5_000,
      ttlMs: 300_000,
    });
    expect(metrics.renderPrometheus()).toContain(
      'weatherflow_owm_requests_total{outcome="cache_hit"} 1',
    );

    jest.useRealTimers();
  });

  it('opens the breaker after the configured failures and rejects until recovery window', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-06-25T12:00:00.000Z'));
    delegate.getCurrentWeather.mockRejectedValue(
      new WeatherDataProviderTimeoutError(5_000),
    );
    const provider = buildProvider({ failureThreshold: 2, breakerOpenMs: 30_000 });

    await expect(provider.getCurrentWeather(location)).rejects.toBeInstanceOf(
      WeatherDataProviderTimeoutError,
    );
    await expect(provider.getCurrentWeather(location)).rejects.toBeInstanceOf(
      WeatherDataProviderTimeoutError,
    );
    await expect(provider.getCurrentWeather(location)).rejects.toBeInstanceOf(
      WeatherDataProviderCircuitOpenError,
    );
    expect(delegate.getCurrentWeather).toHaveBeenCalledTimes(2);
    expect(metrics.renderPrometheus()).toContain(
      'weatherflow_owm_breaker_state{state="open"} 1',
    );

    jest.setSystemTime(new Date('2026-06-25T12:00:31.000Z'));
    delegate.getCurrentWeather.mockResolvedValueOnce(reading);

    await expect(provider.getCurrentWeather(location)).resolves.toBe(reading);
    expect(metrics.renderPrometheus()).toContain(
      'weatherflow_owm_breaker_state{state="closed"} 1',
    );

    jest.useRealTimers();
  });

  it('rejects requests beyond the provider bulkhead limit', async () => {
    let release!: () => void;
    delegate.getCurrentWeather.mockImplementation(
      () =>
        new Promise((resolve) => {
          release = () => resolve(reading);
        }),
    );
    const provider = buildProvider({ bulkheadLimit: 1 });

    const firstRequest = provider.getCurrentWeather(location);
    await expect(provider.getCurrentWeather(location)).rejects.toBeInstanceOf(
      WeatherDataProviderBulkheadRejectedError,
    );
    release();
    await expect(firstRequest).resolves.toBe(reading);
    expect(metrics.renderPrometheus()).toContain(
      'weatherflow_owm_requests_total{outcome="bulkhead_rejected"} 1',
    );
  });

  function buildProvider(
    options: Partial<{
      bulkheadLimit: number;
      cacheTtlMs: number;
      failureThreshold: number;
      breakerOpenMs: number;
    }> = {},
  ): ResilientWeatherDataProvider {
    return new ResilientWeatherDataProvider(
      delegate,
      options.bulkheadLimit ?? 3,
      options.cacheTtlMs ?? 300_000,
      options.failureThreshold ?? 3,
      options.breakerOpenMs ?? 30_000,
      metrics,
    );
  }
});
