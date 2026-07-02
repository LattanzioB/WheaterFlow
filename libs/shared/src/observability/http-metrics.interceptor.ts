import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Counter, Histogram } from 'prom-client';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { MetricsService } from './metrics.service';

type HttpMetricLabels = 'method' | 'route' | 'status_code';

/**
 * Records duration and count of inbound HTTP requests. `route` uses the matched
 * Express route pattern (e.g. `/stations/:id`) instead of the raw URL to keep
 * label cardinality bounded.
 */
@Injectable()
export class HttpMetricsInterceptor implements NestInterceptor {
  private readonly duration: Histogram<HttpMetricLabels>;
  private readonly requests: Counter<HttpMetricLabels>;

  constructor(private readonly metrics: MetricsService) {
    this.duration = this.metrics.getOrCreateHistogram<HttpMetricLabels>({
      name: 'weatherflow_http_server_request_duration_seconds',
      help: 'Inbound HTTP request duration in seconds.',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    });
    this.requests = this.metrics.getOrCreateCounter<HttpMetricLabels>({
      name: 'weatherflow_http_server_requests_total',
      help: 'Inbound HTTP requests by method, route and status code.',
      labelNames: ['method', 'route', 'status_code'],
    });
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const http = context.switchToHttp();
    const request = http.getRequest<{
      method?: string;
      url?: string;
      route?: { path?: string };
    }>();
    const response = http.getResponse<{ statusCode?: number }>();
    const startedAt = process.hrtime.bigint();

    const record = (statusCode: number): void => {
      const labels: Record<HttpMetricLabels, string> = {
        method: request.method ?? 'UNKNOWN',
        route: this.resolveRoute(request),
        status_code: String(statusCode),
      };
      const elapsedSeconds =
        Number(process.hrtime.bigint() - startedAt) / 1_000_000_000;
      this.requests.inc(labels);
      this.duration.observe(labels, elapsedSeconds);
    };

    return next.handle().pipe(
      tap({
        next: () => record(response.statusCode ?? 200),
        error: (error: { status?: number; statusCode?: number }) =>
          record(error?.status ?? error?.statusCode ?? 500),
      }),
    );
  }

  private resolveRoute(request: {
    url?: string;
    route?: { path?: string };
  }): string {
    if (request.route?.path) {
      return request.route.path;
    }
    return request.url?.split('?')[0] ?? 'unknown';
  }
}
