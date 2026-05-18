import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('S-06.5 sequence diagram documentation', () => {
  const projectRoot = process.cwd();
  const sequenceDir = join(projectRoot, 'docs', 'architecture', 'sequences');

  const read = (fileName: string) =>
    readFileSync(join(sequenceDir, fileName), 'utf8').replace(/\r\n/g, '\n');

  const diagrams = [
    'register-user-sequence',
    'login-user-sequence',
    'record-measurement-alert-sequence',
    'manage-notification-preferences-sequence',
    'query-measurements-sequence',
  ];

  it('stores Mermaid source and SVG exports for all required use-case sequences', () => {
    for (const diagram of diagrams) {
      expect(existsSync(join(sequenceDir, `${diagram}.mmd`))).toBe(true);
      expect(existsSync(join(sequenceDir, `${diagram}.svg`))).toBe(true);
    }
  });

  it('covers registration and login authentication flows', () => {
    expect(read('register-user-sequence.mmd')).toContain('POST /auth/register');
    expect(read('register-user-sequence.mmd')).toContain('generateToken');
    expect(read('register-user-sequence.mmd')).toContain(
      '/users/:id/delivery-channels/telegram/link-code',
    );
    expect(read('login-user-sequence.mmd')).toContain('POST /auth/login');
    expect(read('login-user-sequence.mmd')).toContain(
      'compare(password, user.passwordHash)',
    );
  });

  it('captures the preference-aware alert detection and delivery flow', () => {
    const source = read('record-measurement-alert-sequence.mmd');

    expect(source).toContain('Measurement.create(..., alertSettings)');
    expect(source).toContain('emit(MeasurementAlertDetectedEvent)');
    expect(source).toContain('Filter subscribers by station and alert type');
    expect(source).toContain(
      'resolve delivery targets before any channel call',
    );
  });

  it('covers preference management and filtered measurement queries', () => {
    expect(read('manage-notification-preferences-sequence.mmd')).toContain(
      'update station alert preferences',
    );
    expect(read('manage-notification-preferences-sequence.mmd')).toContain(
      'configureTelegramDelivery',
    );
    expect(read('manage-notification-preferences-sequence.mmd')).toContain(
      'startTelegramLinking(code, expiresAt)',
    );
    expect(read('manage-notification-preferences-sequence.mmd')).toContain(
      'findByTelegramLinkCode(code)',
    );
    expect(read('query-measurements-sequence.mmd')).toContain(
      'findWithFilters(normalizedFilters)',
    );
    expect(read('query-measurements-sequence.mmd')).toContain(
      'Resolve matching station IDs from station names',
    );
  });

  it('exports SVG files that embed the main use-case labels', () => {
    expect(read('record-measurement-alert-sequence.svg')).toContain(
      'MeasurementAlertDetectedEvent',
    );
    expect(read('manage-notification-preferences-sequence.svg')).toContain(
      'UpdateDeliveryChannelsService',
    );
    expect(read('query-measurements-sequence.svg')).toContain(
      'QueryMeasurementsService',
    );
  });
});
