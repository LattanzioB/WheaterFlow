import * as Joi from 'joi';

const commonEnvValidationSchema = {
  MONGODB_URI: Joi.string().required().messages({
    'any.required':
      'MONGODB_URI is required. Set it to your MongoDB Atlas URI.',
  }),
  RABBITMQ_URL: Joi.string()
    .uri({ scheme: ['amqp', 'amqps'] })
    .required(),
  RABBITMQ_ALERT_EXCHANGE: Joi.string().default('weatherflow.alerts'),
  RABBITMQ_ALERT_QUEUE: Joi.string().default(
    'weatherflow.notifications.alerts',
  ),
  RABBITMQ_ALERT_ROUTING_KEY: Joi.string().default('alerts.climate.detected'),
  TELEGRAM_BOT_TOKEN: Joi.string().optional().allow(''),
  TELEGRAM_BOT_USERNAME: Joi.string().optional().allow(''),
  TELEGRAM_WEBHOOK_SECRET: Joi.string().optional().allow(''),
};

export const envValidationSchema = Joi.object({
  PORT: Joi.number().default(3000),
  ...commonEnvValidationSchema,
  JWT_SECRET: Joi.string().required().min(8).messages({
    'any.required': 'JWT_SECRET is required. Set it in your .env file.',
    'string.min': 'JWT_SECRET must be at least 8 characters long.',
  }),
  JWT_EXPIRES_IN: Joi.string().default('7d'),
  NOTIFICATION_SERVICE_URL: Joi.string().uri().required(),
  INGESTION_SYSTEM_TOKEN: Joi.string().trim().min(16).required(),
  INGESTION_SERVICE_URL: Joi.string().uri().required(),
  INGESTION_TIMEOUT_MS: Joi.number()
    .integer()
    .min(100)
    .max(120_000)
    .default(5_000),
  INGESTION_CONCURRENCY_LIMIT: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(10),
  INGESTION_BREAKER_FAILURE_THRESHOLD: Joi.number()
    .integer()
    .min(1)
    .max(20)
    .default(3),
  INGESTION_BREAKER_OPEN_MS: Joi.number()
    .integer()
    .min(1_000)
    .max(3_600_000)
    .default(30_000),
  INGESTION_RETRY_ATTEMPTS: Joi.number().integer().min(0).max(1).default(1),
  INGESTION_RETRY_BASE_DELAY_MS: Joi.number()
    .integer()
    .min(0)
    .max(60_000)
    .default(100),
  NOTIFICATION_DELIVERY_MODE: Joi.string()
    .valid('log', 'telegram')
    .default('log'),
});

export const notificationsEnvValidationSchema = Joi.object({
  NOTIFICATIONS_PORT: Joi.number().default(3001),
  ...commonEnvValidationSchema,
  JWT_SECRET: Joi.string().required().min(8).messages({
    'any.required':
      'JWT_SECRET is required so Notification service can authenticate SSE and history requests.',
    'string.min': 'JWT_SECRET must be at least 8 characters long.',
  }),
  JWT_EXPIRES_IN: Joi.string().default('7d'),
  NOTIFICATION_DELIVERY_MODE: Joi.string()
    .valid('log', 'telegram')
    .default('log'),
});
