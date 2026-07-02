import { MetricsService } from './metrics.service';

describe('MetricsService', () => {
  it('renders registered metrics in the Prometheus exposition format', async () => {
    const metrics = new MetricsService();
    const counter = metrics.getOrCreateCounter({
      name: 'weatherflow_test_total',
      help: 'Test counter.',
      labelNames: ['kind'],
    });
    counter.inc({ kind: 'a' });

    const exposition = await metrics.metrics();
    expect(exposition).toContain('weatherflow_test_total{kind="a"} 1');
    expect(metrics.contentType).toContain('text/plain');
  });

  it('returns the same metric instance when created twice (idempotent)', () => {
    const metrics = new MetricsService();
    const first = metrics.getOrCreateGauge({
      name: 'weatherflow_test_gauge',
      help: 'Test gauge.',
    });
    const second = metrics.getOrCreateGauge({
      name: 'weatherflow_test_gauge',
      help: 'Test gauge.',
    });

    expect(second).toBe(first);
  });

  it('adds default process metrics and a service label once enabled', async () => {
    const metrics = new MetricsService();
    metrics.enableDefaultMetrics({ service: 'api' });
    metrics.enableDefaultMetrics({ service: 'api' });

    const exposition = await metrics.metrics();
    expect(exposition).toContain('process_cpu_user_seconds_total');
    expect(exposition).toContain('service="api"');
  });
});
