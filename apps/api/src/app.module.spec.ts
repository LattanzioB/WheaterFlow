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

describe('AppModule', () => {
  beforeAll(() => {
    process.env = {
      ...ORIGINAL_ENV,
      MONGODB_URI: 'mongodb://localhost:27017/weatherflow-test',
      JWT_SECRET: 'test-secret-key',
      RABBITMQ_URL: 'amqp://weatherflow:weatherflow@rabbitmq:5672',
      NOTIFICATION_SERVICE_URL: 'http://notifications:3001',
    };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it('keeps the API application free of the Notification service module', async () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const moduleExports: typeof import('./app.module') =
      await import('./app.module');
    const { AppModule } = moduleExports;

    expect(moduleNames(AppModule)).toEqual(
      expect.arrayContaining([
        'AuthModule',
        'UsersModule',
        'StationsModule',
        'MeasurementsModule',
      ]),
    );
    expect(moduleNames(AppModule)).not.toContain('NotificationsModule');
  });
});
