import { ingestionEnvValidationSchema } from './ingestion-env-validation';

const VALID_ENV = {
  OWM_API_KEY: 'test-api-key',
  OWM_BASE_URL: 'https://api.openweathermap.org',
  API_BASE_URL: 'http://localhost:3000',
  INGESTION_CRON: '*/10 * * * *',
  OWM_CONCURRENCY_LIMIT: 3,
  API_CONCURRENCY_LIMIT: 3,
};

describe('ingestionEnvValidationSchema', () => {
  it('accepts the required ingestion configuration', () => {
    const { error, value } = ingestionEnvValidationSchema.validate(VALID_ENV);

    expect(error).toBeUndefined();
    expect(value).toEqual(
      expect.objectContaining({
        ...VALID_ENV,
        INGESTION_PORT: 3002,
      }),
    );
  });

  it.each(['OWM_API_KEY', 'OWM_BASE_URL', 'API_BASE_URL'] as const)(
    'rejects a missing %s',
    (key) => {
      const invalidEnv = { ...VALID_ENV };
      delete invalidEnv[key];

      const { error } = ingestionEnvValidationSchema.validate(invalidEnv);

      expect(error?.details.some((detail) => detail.path[0] === key)).toBe(
        true,
      );
    },
  );

  it('rejects invalid cron expressions and concurrency limits', () => {
    const { error } = ingestionEnvValidationSchema.validate(
      {
        ...VALID_ENV,
        INGESTION_CRON: 'not-a-cron',
        OWM_CONCURRENCY_LIMIT: 0,
        API_CONCURRENCY_LIMIT: 51,
      },
      { abortEarly: false },
    );

    expect(error?.details.map((detail) => detail.path[0])).toEqual(
      expect.arrayContaining([
        'INGESTION_CRON',
        'OWM_CONCURRENCY_LIMIT',
        'API_CONCURRENCY_LIMIT',
      ]),
    );
  });
});
