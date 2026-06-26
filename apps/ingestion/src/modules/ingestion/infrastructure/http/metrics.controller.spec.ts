import { MetricsController } from './metrics.controller';
import { OpenWeatherResilienceMetrics } from '../resilience/openweather-resilience.metrics';
import { HttpBoundaryMetrics } from '@shared/resilience/http-boundary.metrics';

describe('MetricsController', () => {
  it('renders OpenWeather and internal HTTP resilience metrics', () => {
    const openWeatherMetrics = new OpenWeatherResilienceMetrics();
    openWeatherMetrics.recordRequest('success');
    const httpBoundaryMetrics = new HttpBoundaryMetrics();
    httpBoundaryMetrics.recordRequest('ingestion_to_api', 'retry');
    const controller = new MetricsController(
      openWeatherMetrics,
      httpBoundaryMetrics,
    );

    expect(controller.getMetrics()).toContain(
      'weatherflow_owm_requests_total{outcome="success"} 1',
    );
    expect(controller.getMetrics()).toContain(
      'weatherflow_http_boundary_requests_total{direction="ingestion_to_api",outcome="retry"} 1',
    );
  });
});
