import { DynamicModule, Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';
import { HttpMetricsInterceptor } from './http-metrics.interceptor';
import { buildLoggerOptions } from './logging.options';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';

export const OBSERVABILITY_SERVICE_NAME = 'OBSERVABILITY_SERVICE_NAME';

/**
 * Wires structured logging (nestjs-pino), a Prometheus registry with Node.js
 * default metrics, the `/metrics` endpoint and an HTTP metrics interceptor for a
 * service. Import once in each application root module via `forRoot(service)`.
 */
@Global()
@Module({})
export class ObservabilityModule {
  static forRoot(service: string): DynamicModule {
    return {
      module: ObservabilityModule,
      imports: [LoggerModule.forRoot(buildLoggerOptions(service))],
      controllers: [MetricsController],
      providers: [
        { provide: OBSERVABILITY_SERVICE_NAME, useValue: service },
        {
          provide: MetricsService,
          useFactory: (): MetricsService => {
            const metrics = new MetricsService();
            metrics.enableDefaultMetrics({ service });
            return metrics;
          },
        },
        { provide: APP_INTERCEPTOR, useClass: HttpMetricsInterceptor },
      ],
      exports: [MetricsService, OBSERVABILITY_SERVICE_NAME],
    };
  }
}
