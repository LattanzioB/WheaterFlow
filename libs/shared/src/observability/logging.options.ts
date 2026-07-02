import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Params } from 'nestjs-pino';
import { getTraceContext } from './trace-context';

const CORRELATION_HEADER = 'x-correlation-id';
const SILENT_PATHS = new Set(['/health', '/metrics']);

/**
 * Structured JSON logging shared by every service. Each log line carries the
 * originating `service`, a request `correlationId` (propagated via the
 * `x-correlation-id` header) and, once distributed tracing lands in S-03.12,
 * `traceId`/`spanId` supplied by the trace-context provider.
 */
export function buildLoggerOptions(service: string): Params {
  return {
    pinoHttp: {
      level: process.env.LOG_LEVEL ?? 'info',
      messageKey: 'message',
      base: { service },
      genReqId: (req: IncomingMessage, res: ServerResponse) => {
        const header = req.headers[CORRELATION_HEADER];
        const correlationId =
          (Array.isArray(header) ? header[0] : header) ?? randomUUID();
        res.setHeader(CORRELATION_HEADER, correlationId);
        return correlationId;
      },
      customProps: (req: IncomingMessage) => {
        const requestId = (req as { id?: string | number }).id;
        return {
          service,
          correlationId:
            requestId === undefined ? undefined : String(requestId),
          ...getTraceContext(),
        };
      },
      autoLogging: {
        ignore: (req: IncomingMessage) =>
          SILENT_PATHS.has((req.url ?? '').split('?')[0]),
      },
      redact: {
        paths: [
          'req.headers.authorization',
          'req.headers.cookie',
          'req.headers["x-ingestion-token"]',
        ],
        remove: true,
      },
      formatters: {
        level: (label: string) => ({ level: label }),
      },
    },
  };
}
