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

describe('NotificationsAppModule', () => {
  beforeAll(() => {
    process.env = {
      ...ORIGINAL_ENV,
      MONGODB_URI: 'mongodb://localhost:27017/weatherflow-test',
      RABBITMQ_URL: 'amqp://weatherflow:weatherflow@rabbitmq:5672',
    };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it('boots through the Notification service boundary instead of the API app shell', async () => {
    const moduleExports: typeof import('./notifications-app.module') =
      await import('./notifications-app.module');
    const { NotificationsAppModule } = moduleExports;

    expect(moduleNames(NotificationsAppModule)).toEqual(
      expect.arrayContaining(['NotificationsModule']),
    );
    expect(moduleNames(NotificationsAppModule)).not.toContain('AppModule');
  });
});
