import * as Joi from 'joi';

const cronExpression = /^(\S+\s+){4}\S+$/;

export const ingestionEnvValidationSchema = Joi.object({
  INGESTION_PORT: Joi.number().integer().min(1).max(65535).default(3002),
  OWM_API_KEY: Joi.string().trim().min(1).required(),
  OWM_BASE_URL: Joi.string()
    .uri({ scheme: ['http', 'https'] })
    .required(),
  API_BASE_URL: Joi.string()
    .uri({ scheme: ['http', 'https'] })
    .required(),
  INGESTION_CRON: Joi.string()
    .trim()
    .pattern(cronExpression)
    .default('*/10 * * * *'),
  OWM_CONCURRENCY_LIMIT: Joi.number().integer().min(1).max(50).default(3),
  API_CONCURRENCY_LIMIT: Joi.number().integer().min(1).max(50).default(3),
});
