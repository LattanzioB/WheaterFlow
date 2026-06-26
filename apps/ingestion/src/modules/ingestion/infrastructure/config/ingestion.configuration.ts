export type IngestionConfiguration = {
  port: number;
  openWeather: {
    apiKey: string | undefined;
    baseUrl: string | undefined;
    timeoutMs: number;
    concurrencyLimit: number;
    cacheTtlMs: number;
    breakerFailureThreshold: number;
    breakerOpenMs: number;
  };
  api: {
    baseUrl: string | undefined;
    concurrencyLimit: number;
    systemToken: string | undefined;
  };
  schedule: {
    cron: string;
  };
};

export default (): IngestionConfiguration => ({
  port: Number.parseInt(process.env.INGESTION_PORT ?? '3002', 10),
  openWeather: {
    apiKey: process.env.OWM_API_KEY,
    baseUrl: process.env.OWM_BASE_URL,
    timeoutMs: Number.parseInt(process.env.OWM_TIMEOUT_MS ?? '10000', 10),
    concurrencyLimit: Number.parseInt(
      process.env.OWM_CONCURRENCY_LIMIT ?? '3',
      10,
    ),
    cacheTtlMs: Number.parseInt(process.env.OWM_CACHE_TTL_MS ?? '300000', 10),
    breakerFailureThreshold: Number.parseInt(
      process.env.OWM_BREAKER_FAILURE_THRESHOLD ?? '3',
      10,
    ),
    breakerOpenMs: Number.parseInt(
      process.env.OWM_BREAKER_OPEN_MS ?? '30000',
      10,
    ),
  },
  api: {
    baseUrl: process.env.API_BASE_URL,
    concurrencyLimit: Number.parseInt(
      process.env.API_CONCURRENCY_LIMIT ?? '3',
      10,
    ),
    systemToken: process.env.INGESTION_SYSTEM_TOKEN,
  },
  schedule: {
    cron: process.env.INGESTION_CRON ?? '*/10 * * * *',
  },
});
