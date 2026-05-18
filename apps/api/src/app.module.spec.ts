import { MODULE_METADATA } from '@nestjs/common/constants';
import { AppModule } from './app.module';

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
  it('keeps the API application free of the Notification service module', () => {
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
