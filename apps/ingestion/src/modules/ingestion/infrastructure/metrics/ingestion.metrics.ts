import { Injectable } from '@nestjs/common';
import { Counter, Histogram, Registry } from 'prom-client';
import type {
  IngestionCycleSummary,
  IngestionCycleTrigger,
} from '../../application/services/run-ingestion-cycle.service';

type CycleResult = 'succeeded' | 'partial' | 'failed';
type StationStatus = 'succeeded' | 'failed' | 'skipped';

const TRIGGERS: IngestionCycleTrigger[] = ['scheduled', 'manual'];
const CYCLE_RESULTS: CycleResult[] = ['succeeded', 'partial', 'failed'];
const STATION_STATUSES: StationStatus[] = ['succeeded', 'failed', 'skipped'];

/**
 * Business metrics for scheduled/manual ingestion batches: how many cycles run,
 * how many measurements reach the domain pipeline, and how long each cycle
 * takes. Backed by the shared prom-client registry.
 */
@Injectable()
export class IngestionMetrics {
  private readonly cycles: Counter<'trigger' | 'result'>;
  private readonly stations: Counter<'trigger' | 'status'>;
  private readonly measurementsIngested: Counter<'source' | 'status'>;
  private readonly cycleDuration: Histogram<'trigger'>;

  constructor(registry: Registry = new Registry()) {
    this.cycles = new Counter({
      name: 'weatherflow_ingestion_cycles_total',
      help: 'Ingestion cycles executed by trigger and overall result.',
      labelNames: ['trigger', 'result'],
      registers: [registry],
    });
    this.stations = new Counter({
      name: 'weatherflow_ingestion_stations_total',
      help: 'Stations processed per ingestion cycle by outcome.',
      labelNames: ['trigger', 'status'],
      registers: [registry],
    });
    this.measurementsIngested = new Counter({
      name: 'weatherflow_measurements_ingested_total',
      help: 'Measurements submitted to the domain pipeline by source and status.',
      labelNames: ['source', 'status'],
      registers: [registry],
    });
    this.cycleDuration = new Histogram({
      name: 'weatherflow_ingestion_cycle_duration_seconds',
      help: 'Duration of ingestion cycles in seconds.',
      labelNames: ['trigger'],
      buckets: [0.5, 1, 2.5, 5, 10, 30, 60],
      registers: [registry],
    });

    for (const trigger of TRIGGERS) {
      for (const result of CYCLE_RESULTS) {
        this.cycles.inc({ trigger, result }, 0);
      }
      for (const status of STATION_STATUSES) {
        this.stations.inc({ trigger, status }, 0);
      }
    }
    for (const status of ['succeeded', 'failed'] as const) {
      this.measurementsIngested.inc({ source: 'openweather', status }, 0);
    }
  }

  recordCycle(summary: IngestionCycleSummary): void {
    this.cycles.inc({
      trigger: summary.trigger,
      result: this.resolveResult(summary),
    });
    this.cycleDuration.observe(
      { trigger: summary.trigger },
      summary.durationMs / 1_000,
    );

    this.stations.inc(
      { trigger: summary.trigger, status: 'succeeded' },
      summary.succeeded,
    );
    this.stations.inc(
      { trigger: summary.trigger, status: 'failed' },
      summary.failed,
    );
    this.stations.inc(
      { trigger: summary.trigger, status: 'skipped' },
      summary.skipped,
    );

    if (summary.succeeded > 0) {
      this.measurementsIngested.inc(
        { source: 'openweather', status: 'succeeded' },
        summary.succeeded,
      );
    }
    if (summary.failed > 0) {
      this.measurementsIngested.inc(
        { source: 'openweather', status: 'failed' },
        summary.failed,
      );
    }
  }

  private resolveResult(summary: IngestionCycleSummary): CycleResult {
    if (summary.failed === 0) {
      return 'succeeded';
    }
    if (summary.succeeded === 0) {
      return 'failed';
    }
    return 'partial';
  }
}
