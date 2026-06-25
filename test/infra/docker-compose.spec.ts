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

  it('should define API, notifications, ingestion, web, RabbitMQ, and local MongoDB', () => {
    expect(Object.keys(compose.services).sort()).toEqual([
      'api',
      'ingestion',
      'mongo',
      'notifications',
      'rabbitmq',
      'web',
    ]);
    expect(compose.services.mongo.image).toBe('mongo:7');
  });

  it('should build API, notifications, ingestion, and web from separate Dockerfiles', () => {
    expect(compose.services.api.build?.dockerfile).toBe('apps/api/Dockerfile');
    expect(compose.services.ingestion.build?.dockerfile).toBe(
      'apps/ingestion/Dockerfile',
    );
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
    const ingestionDockerfile = readFileSync(
      join(rootDir, 'apps/ingestion/Dockerfile'),
      'utf8',
    );

    expect(apiDockerfile).toContain(
      'CMD ["node", "dist/apps/api/apps/api/src/main.js"]',
    );
    expect(notificationsDockerfile).toContain(
      'CMD ["node", "dist/apps/notifications/apps/notifications/src/main.js"]',
    );
    expect(ingestionDockerfile).toContain(
      'CMD ["node", "dist/apps/ingestion/apps/ingestion/src/main.js"]',
    );
  });

  it('should expose separate HTTP ports and RabbitMQ management UI', () => {
    expect(compose.services.api.ports).toContain('3000:3000');
    expect(compose.services.mongo.ports).toContain('27017:27017');
    expect(compose.services.notifications.ports).toContain('3001:3001');
    expect(compose.services.ingestion.ports).toContain('3002:3002');
    expect(compose.services.web.ports).toContain('8080:80');
    expect(compose.services.rabbitmq.ports).toEqual(
      expect.arrayContaining(['5672:5672', '15672:15672']),
    );
  });

  it('should make services wait for MongoDB and RabbitMQ health before starting', () => {
    expect(compose.services.mongo.healthcheck).toBeDefined();
    expect(compose.services.rabbitmq.healthcheck).toBeDefined();
    expect(compose.services.api.depends_on?.mongo?.condition).toBe(
      'service_healthy',
    );
    expect(compose.services.api.depends_on?.rabbitmq?.condition).toBe(
      'service_healthy',
    );
    expect(compose.services.notifications.depends_on?.mongo?.condition).toBe(
      'service_healthy',
    );
    expect(compose.services.notifications.depends_on?.rabbitmq?.condition).toBe(
      'service_healthy',
    );
    expect(compose.services.ingestion.depends_on?.api?.condition).toBe(
      'service_healthy',
    );
    expect(compose.services.ingestion.depends_on?.mongo).toBeUndefined();
    expect(compose.services.ingestion.depends_on?.rabbitmq).toBeUndefined();
  });

  it('should default services to local MongoDB while allowing MONGODB_URI override', () => {
    expect(compose.services.api.environment?.MONGODB_URI).toContain(
      'mongodb://mongo:27017/weatherflow',
    );
    expect(compose.services.notifications.environment?.MONGODB_URI).toContain(
      'mongodb://mongo:27017/weatherflow',
    );
  });

  it('should configure and healthcheck the ingestion worker independently', () => {
    expect(compose.services.ingestion.healthcheck).toBeDefined();
    expect(compose.services.ingestion.environment).toEqual(
      expect.objectContaining({
        API_BASE_URL: '${API_BASE_URL:-http://api:3000}',
        INGESTION_CRON: '${INGESTION_CRON:-*/10 * * * *}',
        OWM_TIMEOUT_MS: '${OWM_TIMEOUT_MS:-10000}',
        OWM_CONCURRENCY_LIMIT: '${OWM_CONCURRENCY_LIMIT:-3}',
        API_CONCURRENCY_LIMIT: '${API_CONCURRENCY_LIMIT:-3}',
      }),
    );
  });
});
