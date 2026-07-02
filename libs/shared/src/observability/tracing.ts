import { trace, propagation, context } from '@opentelemetry/api';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { NodeSDK } from '@opentelemetry/sdk-node';
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_NAMESPACE,
} from '@opentelemetry/semantic-conventions';
import { setTraceContextProvider } from './trace-context';

const DEFAULT_OTLP_TRACES_ENDPOINT = 'http://localhost:4318/v1/traces';

let sdk: NodeSDK | undefined;

export type AmqpHeaders = Record<string, unknown>;

export function startOpenTelemetry(serviceName: string): void {
  if (sdk || process.env.OTEL_TRACING_ENABLED === 'false') {
    return;
  }

  sdk = new NodeSDK({
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: serviceName,
      [ATTR_SERVICE_NAMESPACE]: 'weatherflow',
    }),
    traceExporter: new OTLPTraceExporter({
      url:
        process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT ??
        process.env.OTEL_EXPORTER_OTLP_ENDPOINT ??
        DEFAULT_OTLP_TRACES_ENDPOINT,
    }),
    instrumentations: [
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-fs': { enabled: false },
      }),
    ],
  });

  sdk.start();
  setTraceContextProvider(() => {
    const spanContext = trace.getActiveSpan()?.spanContext();

    if (!spanContext) {
      return {};
    }

    return {
      traceId: spanContext.traceId,
      spanId: spanContext.spanId,
    };
  });

  const shutdown = () => {
    void sdk?.shutdown();
  };

  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
}

export function injectTraceContext(headers: AmqpHeaders = {}): AmqpHeaders {
  propagation.inject(context.active(), headers);
  return headers;
}

export function runWithExtractedTraceContext<T>(
  headers: AmqpHeaders | undefined,
  callback: () => T,
): T {
  const extractedContext = propagation.extract(context.active(), headers ?? {});
  return context.with(extractedContext, callback);
}
