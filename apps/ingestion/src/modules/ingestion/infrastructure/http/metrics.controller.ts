import { Controller, Get, Header } from '@nestjs/common';
import { OpenWeatherResilienceMetrics } from '../resilience/openweather-resilience.metrics';

@Controller('metrics')
export class MetricsController {
  constructor(private readonly metrics: OpenWeatherResilienceMetrics) {}

  @Get()
  @Header('Content-Type', 'text/plain; version=0.0.4')
  getMetrics(): string {
    return this.metrics.renderPrometheus();
  }
}
