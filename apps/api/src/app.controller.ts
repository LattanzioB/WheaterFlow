import { Controller, Get, Header } from '@nestjs/common';
import { HttpBoundaryMetrics } from '@shared/resilience/http-boundary.metrics';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly httpBoundaryMetrics: HttpBoundaryMetrics,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  getHealth(): { service: 'api'; status: 'ok' } {
    return {
      service: 'api',
      status: 'ok',
    };
  }

  @Get('metrics')
  @Header('Content-Type', 'text/plain; version=0.0.4')
  getMetrics(): string {
    return this.httpBoundaryMetrics.renderPrometheus();
  }
}
