export type IngestionConfiguration = {
  port: number;
  openWeather: {
    apiKey: string | undefined;
    baseUrl: string | undefined;
    timeoutMs: number;
    concurrencyLimit: number;
  };
  api: {
    baseUrl: string | undefined;
    concurrencyLimit: number;
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
  },
  api: {
    baseUrl: process.env.API_BASE_URL,
    concurrencyLimit: Number.parseInt(
      process.env.API_CONCURRENCY_LIMIT ?? '3',
      10,
    ),
  },
  schedule: {
    cron: process.env.INGESTION_CRON ?? '*/10 * * * *',
  },
});
