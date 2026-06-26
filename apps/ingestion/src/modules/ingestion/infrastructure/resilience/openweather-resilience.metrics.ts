import { Injectable } from '@nestjs/common';
import type { WeatherDataProviderErrorCode } from '../../domain/errors/weather-data-provider.errors';

export type OpenWeatherCircuitState = 'closed' | 'open' | 'half_open';
export type OpenWeatherRequestOutcome =
  | 'success'
  | 'failure'
  | 'cache_hit'
  | 'cache_miss'
  | 'bulkhead_rejected'
  | 'circuit_open';

@Injectable()
export class OpenWeatherResilienceMetrics {
  private readonly requestCounts = new Map<OpenWeatherRequestOutcome, number>();
  private readonly failureCounts = new Map<WeatherDataProviderErrorCode, number>();
  private breakerState: OpenWeatherCircuitState = 'closed';
  private cacheEntries = 0;

  recordRequest(outcome: OpenWeatherRequestOutcome): void {
    this.requestCounts.set(outcome, this.getRequestCount(outcome) + 1);
  }

  recordFailure(code: WeatherDataProviderErrorCode): void {
    this.failureCounts.set(code, this.getFailureCount(code) + 1);
    this.recordRequest('failure');
  }

  setBreakerState(state: OpenWeatherCircuitState): void {
    this.breakerState = state;
  }

  setCacheEntries(entries: number): void {
    this.cacheEntries = entries;
  }

  renderPrometheus(): string {
    const outcomes: OpenWeatherRequestOutcome[] = [
      'success',
      'failure',
      'cache_hit',
      'cache_miss',
      'bulkhead_rejected',
      'circuit_open',
    ];
    const states: OpenWeatherCircuitState[] = ['closed', 'open', 'half_open'];
    const failureCodes: WeatherDataProviderErrorCode[] = [
      'client_error',
      'server_error',
      'timeout',
      'unavailable',
      'invalid_payload',
      'circuit_open',
      'bulkhead_rejected',
    ];

    return [
      '# HELP weatherflow_owm_requests_total OpenWeather boundary requests by outcome.',
      '# TYPE weatherflow_owm_requests_total counter',
      ...outcomes.map(
        (outcome) =>
          `weatherflow_owm_requests_total{outcome="${outcome}"} ${this.getRequestCount(outcome)}`,
      ),
      '# HELP weatherflow_owm_failures_total OpenWeather boundary failures by typed code.',
      '# TYPE weatherflow_owm_failures_total counter',
      ...failureCodes.map(
        (code) =>
          `weatherflow_owm_failures_total{code="${code}"} ${this.getFailureCount(code)}`,
      ),
      '# HELP weatherflow_owm_breaker_state Current OpenWeather circuit breaker state.',
      '# TYPE weatherflow_owm_breaker_state gauge',
      ...states.map(
        (state) =>
          `weatherflow_owm_breaker_state{state="${state}"} ${this.breakerState === state ? 1 : 0}`,
      ),
      '# HELP weatherflow_owm_cache_entries Current valid OpenWeather cache entries.',
      '# TYPE weatherflow_owm_cache_entries gauge',
      `weatherflow_owm_cache_entries ${this.cacheEntries}`,
      '',
    ].join('\n');
  }

  private getRequestCount(outcome: OpenWeatherRequestOutcome): number {
    return this.requestCounts.get(outcome) ?? 0;
  }

  private getFailureCount(code: WeatherDataProviderErrorCode): number {
    return this.failureCounts.get(code) ?? 0;
  }
}
