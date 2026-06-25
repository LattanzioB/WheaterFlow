import { MODULE_METADATA } from '@nestjs/common/constants';

const ORIGINAL_ENV = process.env;

function moduleNames(moduleClass: unknown): string[] {
  const imports = Reflect.getMetadata(
    MODULE_METADATA.IMPORTS,
    moduleClass,
  ) as unknown[];

  return imports.map((entry) => {
    if (typeof entry === 'function') {
      return entry.name;
    }

    if (entry && typeof entry === 'object' && 'module' in entry) {
      return String((entry as { module: { name: string } }).module.name);
    }

    return String(entry);
  });
}

describe('IngestionAppModule', () => {
  beforeAll(() => {
    process.env = {
      ...ORIGINAL_ENV,
      OWM_API_KEY: 'test-api-key',
      OWM_BASE_URL: 'https://api.openweathermap.org',
      OWM_TIMEOUT_MS: '10000',
      API_BASE_URL: 'http://localhost:3000',
      INGESTION_CRON: '*/10 * * * *',
      OWM_CONCURRENCY_LIMIT: '3',
      API_CONCURRENCY_LIMIT: '3',
    };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it('boots through its own service boundary', async () => {
    const moduleExports: typeof import('./ingestion-app.module') =
      await import('./ingestion-app.module');
    const { IngestionAppModule } = moduleExports;

    expect(moduleNames(IngestionAppModule)).toEqual(
      expect.arrayContaining(['IngestionModule']),
    );
    expect(moduleNames(IngestionAppModule)).not.toEqual(
      expect.arrayContaining(['AppModule', 'NotificationsAppModule']),
    );
  });
});
