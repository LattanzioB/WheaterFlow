import { Inject, Injectable } from '@nestjs/common';
import {
  WeatherDataProviderBulkheadRejectedError,
  WeatherDataProviderCircuitOpenError,
  WeatherDataProviderError,
} from '../../domain/errors/weather-data-provider.errors';
import type {
  CachedWeatherDataReading,
  WeatherDataProvider,
  WeatherDataProviderCache,
  WeatherDataReading,
  WeatherLocation,
} from '../../domain/ports/weather-data-provider.port';
import {
  OpenWeatherResilienceMetrics,
  type OpenWeatherCircuitState,
} from './openweather-resilience.metrics';

export const OPENWEATHER_RAW_PROVIDER_TOKEN = 'OpenWeatherRawProvider';
export const OPENWEATHER_CACHE_TTL_MS_TOKEN = 'OpenWeatherCacheTtlMs';
export const OPENWEATHER_BREAKER_FAILURE_THRESHOLD_TOKEN =
  'OpenWeatherBreakerFailureThreshold';
export const OPENWEATHER_BREAKER_OPEN_MS_TOKEN = 'OpenWeatherBreakerOpenMs';
export const OPENWEATHER_BULKHEAD_LIMIT_TOKEN = 'OpenWeatherBulkheadLimit';

type CacheEntry = {
  reading: WeatherDataReading;
  cachedAt: Date;
};

@Injectable()
export class ResilientWeatherDataProvider
  implements WeatherDataProvider, WeatherDataProviderCache
{
  private activeRequests = 0;
  private failures = 0;
  private circuitState: OpenWeatherCircuitState = 'closed';
  private openedAt: Date | null = null;
  private halfOpenProbeInFlight = false;
  private readonly cache = new Map<string, CacheEntry>();

  constructor(
    @Inject(OPENWEATHER_RAW_PROVIDER_TOKEN)
    private readonly delegate: WeatherDataProvider,
    @Inject(OPENWEATHER_BULKHEAD_LIMIT_TOKEN)
    private readonly bulkheadLimit: number,
    @Inject(OPENWEATHER_CACHE_TTL_MS_TOKEN)
    private readonly cacheTtlMs: number,
    @Inject(OPENWEATHER_BREAKER_FAILURE_THRESHOLD_TOKEN)
    private readonly failureThreshold: number,
    @Inject(OPENWEATHER_BREAKER_OPEN_MS_TOKEN)
    private readonly breakerOpenMs: number,
    private readonly metrics: OpenWeatherResilienceMetrics,
  ) {
    this.metrics.setBreakerState(this.circuitState);
  }

  async getCurrentWeather(
    location: WeatherLocation,
  ): Promise<WeatherDataReading> {
    this.rejectWhenBulkheadIsFull();
    this.activeRequests += 1;

    try {
      this.assertCircuitAllowsRequest();
      const reading = await this.delegate.getCurrentWeather(location);
      this.recordSuccess(location, reading);
      return reading;
    } catch (error: unknown) {
      this.recordFailure(error);
      throw error;
    } finally {
      this.activeRequests -= 1;
      if (this.circuitState === 'half_open') {
        this.halfOpenProbeInFlight = false;
      }
    }
  }

  getCachedReading(location: WeatherLocation): CachedWeatherDataReading | null {
    this.pruneExpiredCacheEntries();
    const entry = this.cache.get(this.cacheKey(location));

    if (!entry) {
      this.metrics.recordRequest('cache_miss');
      return null;
    }

    const ageMs = Date.now() - entry.cachedAt.getTime();
    if (ageMs > this.cacheTtlMs) {
      this.cache.delete(this.cacheKey(location));
      this.metrics.setCacheEntries(this.cache.size);
      this.metrics.recordRequest('cache_miss');
      return null;
    }

    this.metrics.recordRequest('cache_hit');
    return {
      reading: entry.reading,
      cachedAt: entry.cachedAt,
      ageMs,
      ttlMs: this.cacheTtlMs,
    };
  }

  private rejectWhenBulkheadIsFull(): void {
    if (this.activeRequests < this.bulkheadLimit) {
      return;
    }

    const error = new WeatherDataProviderBulkheadRejectedError(
      this.bulkheadLimit,
    );
    this.metrics.recordRequest('bulkhead_rejected');
    this.metrics.recordFailure(error.code);
    throw error;
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
    this.metrics.setBreakerState(this.circuitState);
  }

  private rejectOpenCircuit(openedUntil?: Date): never {
    const error = new WeatherDataProviderCircuitOpenError(
      openedUntil ?? new Date(Date.now() + this.breakerOpenMs),
    );
    this.metrics.recordRequest('circuit_open');
    this.metrics.recordFailure(error.code);
    throw error;
  }

  private recordSuccess(
    location: WeatherLocation,
    reading: WeatherDataReading,
  ): void {
    this.failures = 0;
    this.circuitState = 'closed';
    this.openedAt = null;
    this.metrics.setBreakerState(this.circuitState);
    this.metrics.recordRequest('success');
    this.cache.set(this.cacheKey(location), {
      reading,
      cachedAt: new Date(),
    });
    this.pruneExpiredCacheEntries();
    this.metrics.setCacheEntries(this.cache.size);
  }

  private recordFailure(error: unknown): void {
    if (
      error instanceof WeatherDataProviderCircuitOpenError ||
      error instanceof WeatherDataProviderBulkheadRejectedError
    ) {
      return;
    }

    if (error instanceof WeatherDataProviderError) {
      this.metrics.recordFailure(error.code);
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
    this.metrics.setBreakerState(this.circuitState);
  }

  private pruneExpiredCacheEntries(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache) {
      if (now - entry.cachedAt.getTime() > this.cacheTtlMs) {
        this.cache.delete(key);
      }
    }
    this.metrics.setCacheEntries(this.cache.size);
  }

  private cacheKey(location: WeatherLocation): string {
    return `${location.latitude.toFixed(4)}:${location.longitude.toFixed(4)}`;
  }
}
