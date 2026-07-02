import type { IncomingMessage, ServerResponse } from 'node:http';
import { buildLoggerOptions } from './logging.options';
import {
  resetTraceContextProvider,
  setTraceContextProvider,
} from './trace-context';

type PinoHttp = {
  base?: { service?: string };
  genReqId?: (req: IncomingMessage, res: ServerResponse) => string;
  customProps?: (req: IncomingMessage) => Record<string, unknown>;
};

function pinoHttp(service: string): PinoHttp {
  return buildLoggerOptions(service).pinoHttp as PinoHttp;
}

describe('buildLoggerOptions', () => {
  afterEach(() => resetTraceContextProvider());

  it('tags every log line with the service name', () => {
    expect(pinoHttp('ingestion').base?.service).toBe('ingestion');
  });

  it('reuses an inbound correlation id and echoes it on the response', () => {
    const setHeader = jest.fn();
    const options = pinoHttp('api');
    const id = options.genReqId?.(
      {
        headers: { 'x-correlation-id': 'abc-123' },
      } as unknown as IncomingMessage,
      { setHeader } as unknown as ServerResponse,
    );

    expect(id).toBe('abc-123');
    expect(setHeader).toHaveBeenCalledWith('x-correlation-id', 'abc-123');
  });

  it('generates a correlation id when the header is absent', () => {
    const setHeader = jest.fn();
    const options = pinoHttp('api');
    const id = options.genReqId?.(
      { headers: {} } as unknown as IncomingMessage,
      { setHeader } as unknown as ServerResponse,
    );

    expect(id).toEqual(expect.any(String));
    expect((id ?? '').length).toBeGreaterThan(0);
  });

  it('includes trace context in custom props when a provider is wired', () => {
    setTraceContextProvider(() => ({ traceId: 't-1', spanId: 's-1' }));
    const props = pinoHttp('api').customProps?.({
      id: 'corr-1',
    } as unknown as IncomingMessage);

    expect(props).toMatchObject({
      service: 'api',
      correlationId: 'corr-1',
      traceId: 't-1',
      spanId: 's-1',
    });
  });
});
