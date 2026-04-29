import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('S-06.3 domain UML documentation', () => {
  const projectRoot = process.cwd();
  const umlDir = join(projectRoot, 'docs', 'architecture', 'uml');

  const read = (fileName: string) =>
    readFileSync(join(umlDir, fileName), 'utf8').replace(/\r\n/g, '\n');

  it('stores Mermaid source and SVG export for the domain model diagram', () => {
    expect(existsSync(join(umlDir, 'weatherflow-domain-model.mmd'))).toBe(true);
    expect(existsSync(join(umlDir, 'weatherflow-domain-model.svg'))).toBe(true);
  });

  it('documents aggregates and value objects across the core domain modules', () => {
    const source = read('weatherflow-domain-model.mmd');

    expect(source).toContain('User (AggregateRoot)');
    expect(source).toContain('WeatherStation (AggregateRoot)');
    expect(source).toContain('Measurement (AggregateRoot)');
    expect(source).toContain('Email (ValueObject)');
    expect(source).toContain('Location (ValueObject)');
    expect(source).toContain('StationAlertSettings (ValueObject)');
    expect(source).toContain('Temperature (ValueObject)');
    expect(source).toContain('Humidity (ValueObject)');
    expect(source).toContain('Pressure (ValueObject)');
    expect(source).toContain('UserRole (Enumeration)');
    expect(source).toContain('UserDeliveryChannels (ValueObject)');
    expect(source).toContain('UserTelegramLinking (ValueObject)');
  });

  it('captures the measurement alert domain service and domain event', () => {
    const source = read('weatherflow-domain-model.mmd');

    expect(source).toContain('AlertEvaluator (DomainService)');
    expect(source).toContain('MeasurementAlertDetectedEvent (DomainEvent)');
    expect(source).toContain('AlertEvaluator ..> StationAlertSettings');
  });

  it('documents the user delivery and telegram linking model', () => {
    const source = read('weatherflow-domain-model.mmd');

    expect(source).toContain('+startTelegramLinking(code, expiresAt)');
    expect(source).toContain('+getDeliveryChannels()');
    expect(source).toContain('+getTelegramLinking()');
    expect(source).toContain('User --> UserRole : role');
    expect(source).toContain(
      'UserDeliveryChannels *-- TelegramDeliveryChannel : telegram',
    );
  });

  it('exports an SVG that embeds the key domain labels', () => {
    const svg = read('weatherflow-domain-model.svg');

    expect(svg).toContain('WeatherStation');
    expect(svg).toContain('Measurement');
    expect(svg).toContain('MeasurementAlertDetectedEvent');
    expect(svg).toContain('UserTelegramLinking');
  });
});
