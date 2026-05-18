import { MODULE_METADATA } from '@nestjs/common/constants';
import { NotificationsAppModule } from './notifications-app.module';

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
  it('boots through the Notification service boundary instead of the API app shell', () => {
    expect(moduleNames(NotificationsAppModule)).toEqual(
      expect.arrayContaining(['NotificationsModule']),
    );
    expect(moduleNames(NotificationsAppModule)).not.toContain('AppModule');
  });
});
