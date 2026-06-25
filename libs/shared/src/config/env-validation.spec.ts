import {
  envValidationSchema,
  notificationsEnvValidationSchema,
} from './env-validation';

type EnvShape = {
  INGESTION_SYSTEM_TOKEN: string;
  JWT_EXPIRES_IN?: string;
  JWT_SECRET: string;
  MONGODB_URI: string;
  NOTIFICATION_DELIVERY_MODE?: string;
  NOTIFICATION_SERVICE_URL: string;
  NOTIFICATIONS_PORT?: number | string;
  PORT?: number | string;
  RABBITMQ_ALERT_EXCHANGE?: string;
  RABBITMQ_ALERT_QUEUE?: string;
  RABBITMQ_ALERT_ROUTING_KEY?: string;
  RABBITMQ_URL: string;
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_BOT_USERNAME?: string;
  TELEGRAM_WEBHOOK_SECRET?: string;
};

type EnvValidationResult = {
  error?: {
    details: Array<{ context?: { key?: string } }>;
    message: string;
  };
  value: EnvShape;
};

describe('envValidationSchema', () => {
  const validEnv: EnvShape = {
    PORT: 3000,
    MONGODB_URI: 'mongodb://localhost:27017/weatherflow',
    JWT_SECRET: 'super-secret-key-12345',
    JWT_EXPIRES_IN: '7d',
    INGESTION_SYSTEM_TOKEN: 'test-ingestion-system-token',
    NOTIFICATION_SERVICE_URL: 'http://notifications:3001',
    NOTIFICATION_DELIVERY_MODE: 'log',
    RABBITMQ_URL: 'amqp://weatherflow:weatherflow@rabbitmq:5672',
    RABBITMQ_ALERT_EXCHANGE: 'weatherflow.alerts',
    RABBITMQ_ALERT_QUEUE: 'weatherflow.notifications.alerts',
    RABBITMQ_ALERT_ROUTING_KEY: 'alerts.climate.detected',
    TELEGRAM_BOT_TOKEN: 'bot123:ABC-DEF',
    TELEGRAM_BOT_USERNAME: 'weatherflow_bot',
    TELEGRAM_WEBHOOK_SECRET: 'secret-token',
  };

  const omitEnvKeys = (
    env: EnvShape,
    ...keys: Array<keyof EnvShape>
  ): Partial<EnvShape> => {
    const nextEnv: Partial<EnvShape> = { ...env };

    for (const key of keys) {
      delete nextEnv[key];
    }

    return nextEnv;
  };

  const validateEnv = (
    env: Partial<EnvShape>,
    abortEarly = true,
  ): EnvValidationResult =>
    envValidationSchema.validate(env, { abortEarly }) as EnvValidationResult;

  // EC-28
  it('should pass with all required variables present', () => {
    const { error } = validateEnv(validEnv);
    expect(error).toBeUndefined();
  });

  it('should fail when RABBITMQ_URL is missing', () => {
    const env = omitEnvKeys(validEnv, 'RABBITMQ_URL');
    const { error } = validateEnv(env, false);
    expect(error).toBeDefined();
    expect(error!.message).toContain('RABBITMQ_URL');
  });

  it('should fail when NOTIFICATION_SERVICE_URL is missing for the API', () => {
    const env = omitEnvKeys(validEnv, 'NOTIFICATION_SERVICE_URL');
    const { error } = validateEnv(env, false);
    expect(error).toBeDefined();
    expect(error!.message).toContain('NOTIFICATION_SERVICE_URL');
  });

  it('should require a sufficiently long ingestion system token', () => {
    const { error } = validateEnv({
      ...validEnv,
      INGESTION_SYSTEM_TOKEN: 'short',
    });

    expect(error).toBeDefined();
    expect(error!.message).toContain('INGESTION_SYSTEM_TOKEN');
  });

  // EC-20
  it('should fail when MONGODB_URI is missing', () => {
    const env = omitEnvKeys(validEnv, 'MONGODB_URI');
    const { error } = validateEnv(env, false);
    expect(error).toBeDefined();
    expect(error!.message).toContain('MONGODB_URI');
  });

  // EC-21
  it('should fail when JWT_SECRET is missing', () => {
    const env = omitEnvKeys(validEnv, 'JWT_SECRET');
    const { error } = validateEnv(env, false);
    expect(error).toBeDefined();
    expect(error!.message).toContain('JWT_SECRET');
  });

  // EC-22
  it('should fail when JWT_SECRET is shorter than 8 characters', () => {
    const env = { ...validEnv, JWT_SECRET: 'short' };
    const { error } = validateEnv(env);
    expect(error).toBeDefined();
    expect(error!.message).toContain('JWT_SECRET');
  });

  // EC-23
  it('should report multiple errors when both MONGODB_URI and JWT_SECRET are missing', () => {
    const env = omitEnvKeys(validEnv, 'MONGODB_URI', 'JWT_SECRET');
    const { error } = validateEnv(env, false);
    expect(error).toBeDefined();
    expect(error!.details.length).toBeGreaterThanOrEqual(2);
    const fields = error!.details.map((detail) => detail.context?.key);
    expect(fields).toContain('MONGODB_URI');
    expect(fields).toContain('JWT_SECRET');
  });

  // EC-24
  it('should pass when TELEGRAM_BOT_TOKEN is missing', () => {
    const env = omitEnvKeys(validEnv, 'TELEGRAM_BOT_TOKEN');
    const { error } = validateEnv(env);
    expect(error).toBeUndefined();
  });

  // EC-25
  it('should pass when TELEGRAM_BOT_TOKEN is empty string', () => {
    const env = { ...validEnv, TELEGRAM_BOT_TOKEN: '' };
    const { error } = validateEnv(env);
    expect(error).toBeUndefined();
  });

  it('should pass when Telegram webhook metadata is omitted', () => {
    const env = omitEnvKeys(
      validEnv,
      'TELEGRAM_BOT_USERNAME',
      'TELEGRAM_WEBHOOK_SECRET',
    );
    const { error } = validateEnv(env);
    expect(error).toBeUndefined();
  });

  // EC-26
  it('should default PORT to 3000 when not provided', () => {
    const env = omitEnvKeys(validEnv, 'PORT');
    const { error, value } = validateEnv(env);
    expect(error).toBeUndefined();
    expect(value.PORT).toBe(3000);
  });

  // EC-27
  it('should default JWT_EXPIRES_IN to "7d" when not provided', () => {
    const env = omitEnvKeys(validEnv, 'JWT_EXPIRES_IN');
    const { error, value } = validateEnv(env);
    expect(error).toBeUndefined();
    expect(value.JWT_EXPIRES_IN).toBe('7d');
  });

  it('should default RabbitMQ alert topology when optional names are omitted', () => {
    const env = omitEnvKeys(
      validEnv,
      'RABBITMQ_ALERT_EXCHANGE',
      'RABBITMQ_ALERT_QUEUE',
      'RABBITMQ_ALERT_ROUTING_KEY',
    );
    const { error, value } = validateEnv(env);
    expect(error).toBeUndefined();
    expect(value.RABBITMQ_ALERT_EXCHANGE).toBe('weatherflow.alerts');
    expect(value.RABBITMQ_ALERT_QUEUE).toBe('weatherflow.notifications.alerts');
    expect(value.RABBITMQ_ALERT_ROUTING_KEY).toBe('alerts.climate.detected');
  });

  // EC-29
  it('should coerce PORT to a number', () => {
    const env = { ...validEnv, PORT: '8080' };
    const { error, value } = validateEnv(env);
    expect(error).toBeUndefined();
    expect(value.PORT).toBe(8080);
    expect(typeof value.PORT).toBe('number');
  });
});

describe('notificationsEnvValidationSchema', () => {
  const validEnv: Partial<EnvShape> = {
    NOTIFICATIONS_PORT: '3001',
    MONGODB_URI: 'mongodb+srv://user:pass@cluster.mongodb.net/weatherflow',
    JWT_SECRET: 'super-secret-key-12345',
    JWT_EXPIRES_IN: '7d',
    RABBITMQ_URL: 'amqp://weatherflow:weatherflow@rabbitmq:5672',
    RABBITMQ_ALERT_EXCHANGE: 'weatherflow.alerts',
    RABBITMQ_ALERT_QUEUE: 'weatherflow.notifications.alerts',
    RABBITMQ_ALERT_ROUTING_KEY: 'alerts.climate.detected',
    NOTIFICATION_DELIVERY_MODE: 'log',
  };

  const validateNotificationsEnv = (
    env: Partial<EnvShape>,
  ): EnvValidationResult =>
    notificationsEnvValidationSchema.validate(env) as EnvValidationResult;

  it('should pass without API-only service URL settings', () => {
    const { error } = validateNotificationsEnv(validEnv);
    expect(error).toBeUndefined();
  });

  it('should require JWT_SECRET for notification history and SSE auth', () => {
    const { JWT_SECRET, ...env } = validEnv;
    const { error } = validateNotificationsEnv(env);

    expect(JWT_SECRET).toBe('super-secret-key-12345');
    expect(error).toBeDefined();
    expect(error!.message).toContain('JWT_SECRET');
  });

  it('should default NOTIFICATIONS_PORT to 3001', () => {
    const { NOTIFICATIONS_PORT, ...env } = validEnv;
    const { error, value } = validateNotificationsEnv(env);
    expect(NOTIFICATIONS_PORT).toBe('3001');
    expect(error).toBeUndefined();
    expect(value.NOTIFICATIONS_PORT).toBe(3001);
  });

  it('should reject unsupported notification delivery modes', () => {
    const { error } = validateNotificationsEnv({
      ...validEnv,
      NOTIFICATION_DELIVERY_MODE: 'smtp',
    });
    expect(error).toBeDefined();
    expect(error!.message).toContain('NOTIFICATION_DELIVERY_MODE');
  });
});
