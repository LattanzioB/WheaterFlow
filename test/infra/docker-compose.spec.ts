import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';

type ComposeService = {
  build?: {
    context?: string;
    dockerfile?: string;
  };
  depends_on?: Record<string, { condition?: string }>;
  environment?: Record<string, string | number>;
  healthcheck?: unknown;
  image?: string;
  ports?: string[];
};

type ComposeFile = {
  services: Record<string, ComposeService>;
};

const rootDir = join(__dirname, '..', '..');

function readCompose(): ComposeFile {
  return parse(
    readFileSync(join(rootDir, 'docker-compose.yml'), 'utf8'),
  ) as ComposeFile;
}

describe('docker-compose distributed environment', () => {
  const compose = readCompose();

  it('should define API, notifications, web, and RabbitMQ without a MongoDB container', () => {
    expect(Object.keys(compose.services).sort()).toEqual([
      'api',
      'notifications',
      'rabbitmq',
      'web',
    ]);
    expect(compose.services).not.toHaveProperty('mongodb');
  });

  it('should build API, notifications, and web from separate Dockerfiles', () => {
    expect(compose.services.api.build?.dockerfile).toBe('apps/api/Dockerfile');
    expect(compose.services.notifications.build?.dockerfile).toBe(
      'apps/notifications/Dockerfile',
    );
    expect(compose.services.web.build?.dockerfile).toBe('apps/web/Dockerfile');
  });

  it('should start the compiled entrypoint for each Nest application image', () => {
    const apiDockerfile = readFileSync(
      join(rootDir, 'apps/api/Dockerfile'),
      'utf8',
    );
    const notificationsDockerfile = readFileSync(
      join(rootDir, 'apps/notifications/Dockerfile'),
      'utf8',
    );

    expect(apiDockerfile).toContain(
      'CMD ["node", "dist/apps/api/apps/api/src/main.js"]',
    );
    expect(notificationsDockerfile).toContain(
      'CMD ["node", "dist/apps/notifications/apps/notifications/src/main.js"]',
    );
  });

  it('should expose separate HTTP ports and RabbitMQ management UI', () => {
    expect(compose.services.api.ports).toContain('3000:3000');
    expect(compose.services.notifications.ports).toContain('3001:3001');
    expect(compose.services.web.ports).toContain('8080:80');
    expect(compose.services.rabbitmq.ports).toEqual(
      expect.arrayContaining(['5672:5672', '15672:15672']),
    );
  });

  it('should make services wait for RabbitMQ health before starting', () => {
    expect(compose.services.rabbitmq.healthcheck).toBeDefined();
    expect(compose.services.api.depends_on?.rabbitmq?.condition).toBe(
      'service_healthy',
    );
    expect(compose.services.notifications.depends_on?.rabbitmq?.condition).toBe(
      'service_healthy',
    );
  });

  it('should pass Atlas MongoDB through MONGODB_URI instead of composing MongoDB', () => {
    expect(compose.services.api.environment?.MONGODB_URI).toContain(
      'MONGODB_URI',
    );
    expect(compose.services.notifications.environment?.MONGODB_URI).toContain(
      'MONGODB_URI',
    );
  });
});
