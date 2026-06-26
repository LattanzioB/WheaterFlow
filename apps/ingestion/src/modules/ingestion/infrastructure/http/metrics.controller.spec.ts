import { MetricsController } from './metrics.controller';
import { OpenWeatherResilienceMetrics } from '../resilience/openweather-resilience.metrics';

describe('MetricsController', () => {
  it('renders OpenWeather resilience metrics', () => {
    const metrics = new OpenWeatherResilienceMetrics();
    metrics.recordRequest('success');
    const controller = new MetricsController(metrics);

    expect(controller.getMetrics()).toContain(
      'weatherflow_owm_requests_total{outcome="success"} 1',
    );
  });
});
