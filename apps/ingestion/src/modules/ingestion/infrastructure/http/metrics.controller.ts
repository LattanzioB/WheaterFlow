import { Controller, Get, Header } from '@nestjs/common';
import { HttpBoundaryMetrics } from '@shared/resilience/http-boundary.metrics';
import { OpenWeatherResilienceMetrics } from '../resilience/openweather-resilience.metrics';

@Controller('metrics')
export class MetricsController {
  constructor(
    private readonly openWeatherMetrics: OpenWeatherResilienceMetrics,
    private readonly httpBoundaryMetrics: HttpBoundaryMetrics,
  ) {}

  @Get()
  @Header('Content-Type', 'text/plain; version=0.0.4')
  getMetrics(): string {
    return [
      this.openWeatherMetrics.renderPrometheus(),
      this.httpBoundaryMetrics.renderPrometheus(),
    ].join('\n');
  }
}
