import { Registry } from 'prom-client';
import type { IngestionCycleSummary } from '../../application/services/run-ingestion-cycle.service';
import { IngestionMetrics } from './ingestion.metrics';

function summary(
  overrides: Partial<IngestionCycleSummary> = {},
): IngestionCycleSummary {
  return {
    cycleId: 'cycle-1',
    trigger: 'scheduled',
    startedAt: '2026-06-25T12:00:00.000Z',
    completedAt: '2026-06-25T12:00:02.000Z',
    durationMs: 2_000,
    discovered: 3,
    succeeded: 2,
    failed: 1,
    skipped: 0,
    results: [],
    ...overrides,
  };
}

describe('IngestionMetrics', () => {
  it('records cycle result, station outcomes and ingested measurements', async () => {
    const registry = new Registry();
    const metrics = new IngestionMetrics(registry);

    metrics.recordCycle(summary());

    const exposition = await registry.metrics();
    expect(exposition).toContain(
      'weatherflow_ingestion_cycles_total{trigger="scheduled",result="partial"} 1',
    );
    expect(exposition).toContain(
      'weatherflow_ingestion_stations_total{trigger="scheduled",status="succeeded"} 2',
    );
    expect(exposition).toContain(
      'weatherflow_measurements_ingested_total{source="openweather",status="succeeded"} 2',
    );
    expect(exposition).toContain(
      'weatherflow_ingestion_cycle_duration_seconds_count{trigger="scheduled"} 1',
    );
  });

  it('marks a cycle without failures as succeeded', async () => {
    const registry = new Registry();
    const metrics = new IngestionMetrics(registry);

    metrics.recordCycle(summary({ succeeded: 3, failed: 0 }));

    const exposition = await registry.metrics();
    expect(exposition).toContain(
      'weatherflow_ingestion_cycles_total{trigger="scheduled",result="succeeded"} 1',
    );
  });
});
