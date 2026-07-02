import { Injectable } from '@nestjs/common';
import {
  collectDefaultMetrics,
  Counter,
  Gauge,
  Histogram,
  Registry,
  type CounterConfiguration,
  type GaugeConfiguration,
  type HistogramConfiguration,
} from 'prom-client';

/**
 * Per-process Prometheus registry shared by every service.
 *
 * A dedicated `Registry` (instead of the global default one) keeps unit tests
 * isolated: each instance owns its metrics, so re-instantiating providers across
 * specs never triggers duplicate-registration errors.
 */
@Injectable()
export class MetricsService {
  readonly registry: Registry;
  private defaultsEnabled = false;

  constructor() {
    this.registry = new Registry();
  }

  /**
   * Adds Node.js process/hardware metrics (CPU, memory, event loop, GC) and a
   * `service` default label to every series. Called once during module wiring so
   * unit tests that build metric providers directly stay noise-free.
   */
  enableDefaultMetrics(defaultLabels: Record<string, string>): void {
    if (this.defaultsEnabled) {
      return;
    }
    this.defaultsEnabled = true;
    this.registry.setDefaultLabels(defaultLabels);
    collectDefaultMetrics({ register: this.registry });
  }

  getOrCreateCounter<T extends string>(
    config: CounterConfiguration<T>,
  ): Counter<T> {
    const existing = this.registry.getSingleMetric(config.name);
    if (existing) {
      return existing as Counter<T>;
    }
    return new Counter<T>({ ...config, registers: [this.registry] });
  }

  getOrCreateGauge<T extends string>(config: GaugeConfiguration<T>): Gauge<T> {
    const existing = this.registry.getSingleMetric(config.name);
    if (existing) {
      return existing as Gauge<T>;
    }
    return new Gauge<T>({ ...config, registers: [this.registry] });
  }

  getOrCreateHistogram<T extends string>(
    config: HistogramConfiguration<T>,
  ): Histogram<T> {
    const existing = this.registry.getSingleMetric(config.name);
    if (existing) {
      return existing as Histogram<T>;
    }
    return new Histogram<T>({ ...config, registers: [this.registry] });
  }

  metrics(): Promise<string> {
    return this.registry.metrics();
  }

  get contentType(): string {
    return this.registry.contentType;
  }
}
