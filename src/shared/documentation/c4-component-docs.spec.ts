import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('S-06.2 C4 component documentation', () => {
  const projectRoot = process.cwd();
  const c4Dir = join(projectRoot, 'docs', 'architecture', 'c4');

  const read = (fileName: string) =>
    readFileSync(join(c4Dir, fileName), 'utf8').replace(/\r\n/g, '\n');

  it('stores Mermaid source and SVG export for the component diagram', () => {
    expect(existsSync(join(c4Dir, 'weatherflow-component.mmd'))).toBe(true);
    expect(existsSync(join(c4Dir, 'weatherflow-component.svg'))).toBe(true);
  });

  it('documents all requested internal modules in the component diagram source', () => {
    const source = read('weatherflow-component.mmd');

    expect(source).toContain('Auth module');
    expect(source).toContain('Users module');
    expect(source).toContain('Stations module');
    expect(source).toContain('Measurements module');
    expect(source).toContain('Notifications module');
  });

  it('captures the preference-resolution flow before Telegram delivery', () => {
    const source = read('weatherflow-component.mmd');

    expect(source).toContain('Preference resolution flow');
    expect(source).toContain('filter by station + alert type');
    expect(source).toContain('resolve delivery targets');
    expect(source).toContain('TelegramAlertNotifierAdapter');
  });

  it('exports an SVG that includes the notification orchestration labels', () => {
    const svg = read('weatherflow-component.svg');

    expect(svg).toContain('NotificationService');
    expect(svg).toContain('Preference resolution flow');
    expect(svg).toContain('Telegram Bot API');
  });
});
