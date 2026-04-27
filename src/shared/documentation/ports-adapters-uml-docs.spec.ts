import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('S-06.4 ports and adapters UML documentation', () => {
  const projectRoot = process.cwd();
  const umlDir = join(projectRoot, 'docs', 'architecture', 'uml');

  const read = (fileName: string) =>
    readFileSync(join(umlDir, fileName), 'utf8').replace(/\r\n/g, '\n');

  it('stores Mermaid source and SVG export for the ports and adapters diagram', () => {
    expect(existsSync(join(umlDir, 'weatherflow-ports-adapters.mmd'))).toBe(
      true,
    );
    expect(existsSync(join(umlDir, 'weatherflow-ports-adapters.svg'))).toBe(
      true,
    );
  });

  it('documents repository, auth, and notification ports', () => {
    const source = read('weatherflow-ports-adapters.mmd');

    expect(source).toContain('PasswordHasher (Port)');
    expect(source).toContain('TokenService (Port)');
    expect(source).toContain('IUserRepository (Port)');
    expect(source).toContain('IStationRepository (Port)');
    expect(source).toContain('IMeasurementRepository (Port)');
    expect(source).toContain('AlertNotifier (Port)');
  });

  it('documents concrete adapters and their dependency direction', () => {
    const source = read('weatherflow-ports-adapters.mmd');

    expect(source).toContain('PasswordHasher <|.. BcryptPasswordHasher');
    expect(source).toContain('TokenService <|.. JwtTokenService');
    expect(source).toContain('IUserRepository <|.. MongoUserRepository');
    expect(source).toContain(
      'IStationRepository <|.. MongoWeatherStationRepository',
    );
    expect(source).toContain(
      'IMeasurementRepository <|.. MongoMeasurementRepository',
    );
    expect(source).toContain(
      'AlertNotifier <|.. TelegramAlertNotifierAdapter',
    );
  });

  it('shows generic notification payloads separately from the Telegram-specific adapter', () => {
    const source = read('weatherflow-ports-adapters.mmd');

    expect(source).toContain('MeasurementAlertNotification (RequestModel)');
    expect(source).toContain('NotificationDeliveryTarget (RequestModel)');
    expect(source).toContain(
      'TelegramAlertNotifierAdapter (TelegramAdapter)',
    );
  });

  it('exports an SVG that embeds the key ports and adapters labels', () => {
    const svg = read('weatherflow-ports-adapters.svg');

    expect(svg).toContain('MongoMeasurementRepository');
    expect(svg).toContain('TelegramAlertNotifierAdapter');
    expect(svg).toContain('MeasurementAlertNotification');
  });
});
