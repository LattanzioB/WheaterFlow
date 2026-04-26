import { envValidationSchema } from './env-validation';

type EnvShape = {
  JWT_EXPIRES_IN?: string;
  JWT_SECRET: string;
  MONGODB_URI: string;
  PORT?: number | string;
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

  // EC-29
  it('should coerce PORT to a number', () => {
    const env = { ...validEnv, PORT: '8080' };
    const { error, value } = validateEnv(env);
    expect(error).toBeUndefined();
    expect(value.PORT).toBe(8080);
    expect(typeof value.PORT).toBe('number');
  });
});
