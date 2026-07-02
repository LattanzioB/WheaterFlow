import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { lastValueFrom, of, throwError } from 'rxjs';
import { HttpMetricsInterceptor } from './http-metrics.interceptor';
import { MetricsService } from './metrics.service';

function buildContext(
  request: { method: string; url?: string; route?: { path?: string } },
  response: { statusCode: number },
): ExecutionContext {
  return {
    getType: () => 'http',
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
  } as unknown as ExecutionContext;
}

describe('HttpMetricsInterceptor', () => {
  it('records duration and count using the matched route pattern', async () => {
    const metrics = new MetricsService();
    const interceptor = new HttpMetricsInterceptor(metrics);
    const context = buildContext(
      { method: 'GET', url: '/stations/42', route: { path: '/stations/:id' } },
      { statusCode: 200 },
    );
    const next: CallHandler = { handle: () => of('ok') };

    await lastValueFrom(interceptor.intercept(context, next));

    const exposition = await metrics.metrics();
    expect(exposition).toContain(
      'weatherflow_http_server_requests_total{method="GET",route="/stations/:id",status_code="200"} 1',
    );
    expect(exposition).toContain(
      'weatherflow_http_server_request_duration_seconds_count{method="GET",route="/stations/:id",status_code="200"} 1',
    );
  });

  it('records the error status code when the handler throws', async () => {
    const metrics = new MetricsService();
    const interceptor = new HttpMetricsInterceptor(metrics);
    const context = buildContext(
      { method: 'POST', url: '/measurements' },
      { statusCode: 200 },
    );
    const next: CallHandler = {
      handle: () => throwError(() => ({ status: 503 })),
    };

    await expect(
      lastValueFrom(interceptor.intercept(context, next)),
    ).rejects.toBeDefined();

    const exposition = await metrics.metrics();
    expect(exposition).toContain(
      'weatherflow_http_server_requests_total{method="POST",route="/measurements",status_code="503"} 1',
    );
  });
});
