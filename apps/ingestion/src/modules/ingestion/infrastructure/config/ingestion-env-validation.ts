import * as Joi from 'joi';

const cronExpression = /^(\S+\s+){4}\S+$/;

export const ingestionEnvValidationSchema = Joi.object({
  INGESTION_PORT: Joi.number().integer().min(1).max(65535).default(3002),
  OWM_API_KEY: Joi.string().trim().min(1).required(),
  OWM_BASE_URL: Joi.string()
    .uri({ scheme: ['http', 'https'] })
    .required(),
  OWM_TIMEOUT_MS: Joi.number().integer().min(100).max(120_000).default(10_000),
  OWM_CACHE_TTL_MS: Joi.number()
    .integer()
    .min(1_000)
    .max(3_600_000)
    .default(300_000),
  OWM_BREAKER_FAILURE_THRESHOLD: Joi.number().integer().min(1).max(20).default(3),
  OWM_BREAKER_OPEN_MS: Joi.number()
    .integer()
    .min(1_000)
    .max(3_600_000)
    .default(30_000),
  API_BASE_URL: Joi.string()
    .uri({ scheme: ['http', 'https'] })
    .required(),
  INGESTION_SYSTEM_TOKEN: Joi.string().trim().min(16).required(),
  INGESTION_CRON: Joi.string()
    .trim()
    .pattern(cronExpression)
    .default('*/10 * * * *'),
  OWM_CONCURRENCY_LIMIT: Joi.number().integer().min(1).max(50).default(3),
  API_CONCURRENCY_LIMIT: Joi.number().integer().min(1).max(50).default(3),
});
