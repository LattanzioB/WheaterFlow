import { Injectable } from '@nestjs/common';
import { Counter, Gauge, Registry } from 'prom-client';
import type { WeatherDataProviderErrorCode } from '../../domain/errors/weather-data-provider.errors';

export type OpenWeatherCircuitState = 'closed' | 'open' | 'half_open';
export type OpenWeatherRequestOutcome =
  | 'success'
  | 'failure'
  | 'cache_hit'
  | 'cache_miss'
  | 'bulkhead_rejected'
  | 'circuit_open';

const OUTCOMES: OpenWeatherRequestOutcome[] = [
  'success',
  'failure',
  'cache_hit',
  'cache_miss',
  'bulkhead_rejected',
  'circuit_open',
];

const STATES: OpenWeatherCircuitState[] = ['closed', 'open', 'half_open'];

const FAILURE_CODES: WeatherDataProviderErrorCode[] = [
  'client_error',
  'server_error',
  'timeout',
  'unavailable',
  'invalid_payload',
  'circuit_open',
  'bulkhead_rejected',
];

/**
 * Prometheus metrics for the OpenWeatherMap boundary. Backed by the shared
 * prom-client registry; a private registry is created when none is supplied so
 * unit tests stay isolated.
 */
@Injectable()
export class OpenWeatherResilienceMetrics {
  readonly registry: Registry;
  private readonly requests: Counter<'outcome'>;
  private readonly failures: Counter<'code'>;
  private readonly breaker: Gauge<'state'>;
  private readonly cacheEntries: Gauge<string>;

  constructor(registry: Registry = new Registry()) {
    this.registry = registry;
    this.requests = new Counter({
      name: 'weatherflow_owm_requests_total',
      help: 'OpenWeather boundary requests by outcome.',
      labelNames: ['outcome'],
      registers: [registry],
    });
    this.failures = new Counter({
      name: 'weatherflow_owm_failures_total',
      help: 'OpenWeather boundary failures by typed code.',
      labelNames: ['code'],
      registers: [registry],
    });
    this.breaker = new Gauge({
      name: 'weatherflow_owm_breaker_state',
      help: 'Current OpenWeather circuit breaker state.',
      labelNames: ['state'],
      registers: [registry],
    });
    this.cacheEntries = new Gauge({
      name: 'weatherflow_owm_cache_entries',
      help: 'Current valid OpenWeather cache entries.',
      registers: [registry],
    });

    for (const outcome of OUTCOMES) {
      this.requests.inc({ outcome }, 0);
    }
    for (const code of FAILURE_CODES) {
      this.failures.inc({ code }, 0);
    }
    for (const state of STATES) {
      this.breaker.set({ state }, state === 'closed' ? 1 : 0);
    }
    this.cacheEntries.set(0);
  }

  recordRequest(outcome: OpenWeatherRequestOutcome): void {
    this.requests.inc({ outcome });
  }

  recordFailure(code: WeatherDataProviderErrorCode): void {
    this.failures.inc({ code });
    this.recordRequest('failure');
  }

  setBreakerState(state: OpenWeatherCircuitState): void {
    for (const candidate of STATES) {
      this.breaker.set({ state: candidate }, candidate === state ? 1 : 0);
    }
  }

  setCacheEntries(entries: number): void {
    this.cacheEntries.set(entries);
  }
}
