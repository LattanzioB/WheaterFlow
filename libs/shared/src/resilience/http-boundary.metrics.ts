export type HttpBoundaryDirection = 'ingestion_to_api' | 'api_to_ingestion';

export type HttpBoundaryCircuitState = 'closed' | 'open' | 'half_open';

export type HttpBoundaryRequestOutcome =
  | 'attempt'
  | 'success'
  | 'failure'
  | 'retry'
  | 'bulkhead_rejected'
  | 'circuit_open';

export class HttpBoundaryMetrics {
  private readonly requestCounts = new Map<string, number>();
  private readonly breakerStates = new Map<
    HttpBoundaryDirection,
    HttpBoundaryCircuitState
  >();

  recordRequest(
    direction: HttpBoundaryDirection,
    outcome: HttpBoundaryRequestOutcome,
  ): void {
    const key = this.requestKey(direction, outcome);
    this.requestCounts.set(key, (this.requestCounts.get(key) ?? 0) + 1);
  }

  setBreakerState(
    direction: HttpBoundaryDirection,
    state: HttpBoundaryCircuitState,
  ): void {
    this.breakerStates.set(direction, state);
  }

  renderPrometheus(): string {
    const directions: HttpBoundaryDirection[] = [
      'ingestion_to_api',
      'api_to_ingestion',
    ];
    const outcomes: HttpBoundaryRequestOutcome[] = [
      'attempt',
      'success',
      'failure',
      'retry',
      'bulkhead_rejected',
      'circuit_open',
    ];
    const states: HttpBoundaryCircuitState[] = ['closed', 'open', 'half_open'];

    return [
      '# HELP weatherflow_http_boundary_requests_total Internal REST boundary requests by direction and outcome.',
      '# TYPE weatherflow_http_boundary_requests_total counter',
      ...directions.flatMap((direction) =>
        outcomes.map(
          (outcome) =>
            `weatherflow_http_boundary_requests_total{direction="${direction}",outcome="${outcome}"} ${this.getRequestCount(direction, outcome)}`,
        ),
      ),
      '# HELP weatherflow_http_boundary_breaker_state Internal REST boundary circuit breaker state.',
      '# TYPE weatherflow_http_boundary_breaker_state gauge',
      ...directions.flatMap((direction) =>
        states.map(
          (state) =>
            `weatherflow_http_boundary_breaker_state{direction="${direction}",state="${state}"} ${this.getBreakerState(direction) === state ? 1 : 0}`,
        ),
      ),
      '',
    ].join('\n');
  }

  private getRequestCount(
    direction: HttpBoundaryDirection,
    outcome: HttpBoundaryRequestOutcome,
  ): number {
    return this.requestCounts.get(this.requestKey(direction, outcome)) ?? 0;
  }

  private getBreakerState(
    direction: HttpBoundaryDirection,
  ): HttpBoundaryCircuitState {
    return this.breakerStates.get(direction) ?? 'closed';
  }

  private requestKey(
    direction: HttpBoundaryDirection,
    outcome: HttpBoundaryRequestOutcome,
  ): string {
    return `${direction}:${outcome}`;
  }
}
