export type TraceContext = {
  traceId?: string;
  spanId?: string;
};

export type TraceContextProvider = () => TraceContext;

const noopProvider: TraceContextProvider = () => ({});

let currentProvider: TraceContextProvider = noopProvider;

/**
 * Returns the active trace/span identifiers when a tracing provider is wired
 * (distributed tracing arrives in S-03.12). Until then it resolves to an empty
 * object so logs simply omit the fields, honoring "traceId/spanId when
 * available".
 */
export function getTraceContext(): TraceContext {
  return currentProvider();
}

/** Allows S-03.12 (OpenTelemetry) to inject the real trace context resolver. */
export function setTraceContextProvider(provider: TraceContextProvider): void {
  currentProvider = provider;
}

export function resetTraceContextProvider(): void {
  currentProvider = noopProvider;
}
