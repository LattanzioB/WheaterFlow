import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('S-03.15 distributed C4 architecture documentation', () => {
  const projectRoot = process.cwd();
  const c4Dir = join(projectRoot, 'docs', 'architecture', 'c4');

  const read = (fileName: string) =>
    readFileSync(join(c4Dir, fileName), 'utf8').replace(/\r\n/g, '\n');

  it('stores PlantUML source and PNG export for the system context diagram', () => {
    expect(existsSync(join(c4Dir, 'c4_level_1_context.plantuml'))).toBe(true);
    expect(existsSync(join(c4Dir, 'c4_level_1_context.png'))).toBe(true);
  });

  it('documents the required actor and system boundary in the context diagram source', () => {
    const source = read('c4_level_1_context.plantuml');

    expect(source).toContain('Person(usuario, "Usuario"');
    expect(source).toContain('System(weatherflow, "WeatherFlow"');
    expect(source).toContain('Telegram Bot API');
  });

  it('stores PlantUML source and PNG export for the container diagram', () => {
    expect(existsSync(join(c4Dir, 'c4_level_2_container.plantuml'))).toBe(
      true,
    );
    expect(existsSync(join(c4Dir, 'c4_level_2_container.png'))).toBe(true);
  });

  it('documents the distributed services and external providers in the container diagram source', () => {
    const source = read('c4_level_2_container.plantuml');

    expect(source).toContain('Container(web, "Web UI"');
    expect(source).toContain('Container(api, "API service"');
    expect(source).toContain('Container(notifications, "Notification service"');
    expect(source).toContain('Container(ingestion, "Ingestion service"');
    expect(source).toContain('ContainerDb(rabbit, "RabbitMQ"');
    expect(source).toContain('ContainerDb_Ext(mongoAtlas, "MongoDB Atlas"');
    expect(source).toContain('System_Ext(openweather, "OpenWeatherMap API"');
    expect(source).toContain('System_Ext(telegram, "Telegram Bot API"');
  });

  it('documents the observability stack introduced in Delivery III in the container diagram source', () => {
    const source = read('c4_level_2_container.plantuml');

    expect(source).toContain('Container(prometheus, "Prometheus"');
    expect(source).toContain('Container(grafana, "Grafana"');
    expect(source).toContain('Container(loki, "Loki"');
    expect(source).toContain('Container(jaeger, "Jaeger"');
    expect(source).toContain('Container(alertmanager, "Alertmanager"');
    expect(source).toContain('Rel(prometheus, alertmanager,');
    expect(source).toContain('Rel(grafana, prometheus,');
    expect(source).toContain('Rel(grafana, loki,');
  });
});
