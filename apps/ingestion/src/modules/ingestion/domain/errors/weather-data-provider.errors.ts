export type WeatherDataProviderErrorCode =
  | 'client_error'
  | 'server_error'
  | 'timeout'
  | 'unavailable'
  | 'invalid_payload'
  | 'circuit_open'
  | 'bulkhead_rejected';

export abstract class WeatherDataProviderError extends Error {
  protected constructor(
    message: string,
    public readonly code: WeatherDataProviderErrorCode,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = new.target.name;
  }
}

export class WeatherDataProviderHttpError extends WeatherDataProviderError {
  constructor(
    public readonly status: number,
    public readonly responseBody?: unknown,
  ) {
    const code = status >= 500 ? 'server_error' : 'client_error';
    super(`OpenWeather request failed with HTTP status ${status}`, code);
  }
}

export class WeatherDataProviderTimeoutError extends WeatherDataProviderError {
  constructor(
    public readonly timeoutMs: number,
    options?: ErrorOptions,
  ) {
    super(
      `OpenWeather request timed out after ${timeoutMs} ms`,
      'timeout',
      options,
    );
  }
}

export class WeatherDataProviderUnavailableError extends WeatherDataProviderError {
  constructor(options?: ErrorOptions) {
    super(
      'OpenWeather request failed before receiving a response',
      'unavailable',
      options,
    );
  }
}

export class WeatherDataProviderInvalidPayloadError extends WeatherDataProviderError {
  constructor(
    public readonly reason: string,
    options?: ErrorOptions,
  ) {
    super(
      `OpenWeather returned an invalid payload: ${reason}`,
      'invalid_payload',
      options,
    );
  }
}

export class WeatherDataProviderCircuitOpenError extends WeatherDataProviderError {
  constructor(
    public readonly openedUntil: Date,
    options?: ErrorOptions,
  ) {
    super(
      `OpenWeather circuit breaker is open until ${openedUntil.toISOString()}`,
      'circuit_open',
      options,
    );
  }
}

export class WeatherDataProviderBulkheadRejectedError extends WeatherDataProviderError {
  constructor(
    public readonly concurrencyLimit: number,
    options?: ErrorOptions,
  ) {
    super(
      `OpenWeather bulkhead rejected the request at concurrency limit ${concurrencyLimit}`,
      'bulkhead_rejected',
      options,
    );
  }
}
