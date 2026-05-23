import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('S-02.8 distributed C4 component documentation', () => {
  const projectRoot = process.cwd();
  const c4Dir = join(projectRoot, 'docs', 'architecture', 'c4');

  const read = (fileName: string) =>
    readFileSync(join(c4Dir, fileName), 'utf8').replace(/\r\n/g, '\n');

  it('stores Mermaid source and SVG export for the component diagram', () => {
    expect(existsSync(join(c4Dir, 'weatherflow-component.mmd'))).toBe(true);
    expect(existsSync(join(c4Dir, 'weatherflow-component.svg'))).toBe(true);
  });

  it('documents API and Notification service component boundaries', () => {
    const source = read('weatherflow-component.mmd');

    expect(source).toContain('API service - apps/api');
    expect(source).toContain('Notification service - apps/notifications');
    expect(source).toContain('AuthController');
    expect(source).toContain('WeatherStationsController');
    expect(source).toContain('MeasurementsController');
    expect(source).toContain('NotificationPreferencesController');
  });

  it('captures ports and adapters across the distributed notification flow', () => {
    const source = read('weatherflow-component.mmd');

    expect(source).toContain('HttpNotificationServiceClient');
    expect(source).toContain('RabbitMqAlertPublisherAdapter');
    expect(source).toContain('RabbitMqClimateAlertConsumerAdapter');
    expect(source).toContain('Filter subscribers by station + alert type');
    expect(source).toContain('Resolve delivery targets');
    expect(source).toContain('Telegram adapters');
  });

  it('exports an SVG that includes the notification orchestration labels', () => {
    const svg = read('weatherflow-component.svg');

    expect(svg).toContain('NotificationService');
    expect(svg).toContain('RabbitMqClimateAlertConsumerAdapter');
    expect(svg).toContain('HttpNotificationServiceClient');
    expect(svg).toContain('Telegram Bot API');
  });
});
