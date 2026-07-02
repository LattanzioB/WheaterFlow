import { Counter, Gauge, Registry } from 'prom-client';

export type HttpBoundaryDirection = 'ingestion_to_api' | 'api_to_ingestion';

export type HttpBoundaryCircuitState = 'closed' | 'open' | 'half_open';

export type HttpBoundaryRequestOutcome =
  | 'attempt'
  | 'success'
  | 'failure'
  | 'retry'
  | 'bulkhead_rejected'
  | 'circuit_open';

const DIRECTIONS: HttpBoundaryDirection[] = [
  'ingestion_to_api',
  'api_to_ingestion',
];

const OUTCOMES: HttpBoundaryRequestOutcome[] = [
  'attempt',
  'success',
  'failure',
  'retry',
  'bulkhead_rejected',
  'circuit_open',
];

const STATES: HttpBoundaryCircuitState[] = ['closed', 'open', 'half_open'];

/**
 * Prometheus metrics for the internal REST boundary between the API and the
 * ingestion service. Backed by the shared prom-client registry; a private
 * registry is created when none is supplied so unit tests stay isolated.
 */
export class HttpBoundaryMetrics {
  readonly registry: Registry;
  private readonly requests: Counter<'direction' | 'outcome'>;
  private readonly breaker: Gauge<'direction' | 'state'>;

  constructor(registry: Registry = new Registry()) {
    this.registry = registry;
    this.requests = new Counter({
      name: 'weatherflow_http_boundary_requests_total',
      help: 'Internal REST boundary requests by direction and outcome.',
      labelNames: ['direction', 'outcome'],
      registers: [registry],
    });
    this.breaker = new Gauge({
      name: 'weatherflow_http_boundary_breaker_state',
      help: 'Internal REST boundary circuit breaker state.',
      labelNames: ['direction', 'state'],
      registers: [registry],
    });

    for (const direction of DIRECTIONS) {
      for (const outcome of OUTCOMES) {
        this.requests.inc({ direction, outcome }, 0);
      }
      for (const state of STATES) {
        this.breaker.set({ direction, state }, state === 'closed' ? 1 : 0);
      }
    }
  }

  recordRequest(
    direction: HttpBoundaryDirection,
    outcome: HttpBoundaryRequestOutcome,
  ): void {
    this.requests.inc({ direction, outcome });
  }

  setBreakerState(
    direction: HttpBoundaryDirection,
    state: HttpBoundaryCircuitState,
  ): void {
    for (const candidate of STATES) {
      this.breaker.set(
        { direction, state: candidate },
        candidate === state ? 1 : 0,
      );
    }
  }
}
