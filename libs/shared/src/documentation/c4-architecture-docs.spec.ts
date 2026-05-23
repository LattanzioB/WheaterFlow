import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('S-02.8 distributed C4 architecture documentation', () => {
  const projectRoot = process.cwd();
  const c4Dir = join(projectRoot, 'docs', 'architecture', 'c4');

  const read = (fileName: string) =>
    readFileSync(join(c4Dir, fileName), 'utf8').replace(/\r\n/g, '\n');

  it('stores Mermaid source and SVG export for the system context diagram', () => {
    expect(existsSync(join(c4Dir, 'weatherflow-context.mmd'))).toBe(true);
    expect(existsSync(join(c4Dir, 'weatherflow-context.svg'))).toBe(true);
  });

  it('documents the required actors and external boundaries in the context diagram source', () => {
    const source = read('weatherflow-context.mmd');

    expect(source).toContain('User and API clients');
    expect(source).toContain('WeatherFlow System Boundary');
    expect(source).toContain('API service');
    expect(source).toContain('Notification service');
    expect(source).toContain('RabbitMQ');
    expect(source).toContain('Telegram Bot API');
    expect(source).toContain('MongoDB Atlas');
  });

  it('stores Mermaid source and SVG export for the container diagram', () => {
    expect(existsSync(join(c4Dir, 'weatherflow-container.mmd'))).toBe(true);
    expect(existsSync(join(c4Dir, 'weatherflow-container.svg'))).toBe(true);
  });

  it('documents the distributed services, broker, and managed database in the container diagram source', () => {
    const source = read('weatherflow-container.mmd');

    expect(source).toContain('API service');
    expect(source).toContain('Notification service');
    expect(source).toContain('RabbitMQ');
    expect(source).toContain('ClimateAlertDetectedMessage');
    expect(source).toContain('MongoDB Atlas');
    expect(source).toContain('Telegram Bot API');
  });

  it('exports SVG files that embed the rendered WeatherFlow labels', () => {
    const contextSvg = read('weatherflow-context.svg');
    const containerSvg = read('weatherflow-container.svg');

    expect(contextSvg).toContain('WeatherFlow');
    expect(contextSvg).toContain('API service');
    expect(contextSvg).toContain('Notification service');
    expect(contextSvg).toContain('Telegram Bot API');
    expect(containerSvg).toContain('RabbitMQ');
    expect(containerSvg).toContain('Notification service');
    expect(containerSvg).toContain('MongoDB Atlas');
  });
});
