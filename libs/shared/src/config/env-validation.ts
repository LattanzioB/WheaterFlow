import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  PORT: Joi.number().default(3000),
  MONGODB_URI: Joi.string().required().messages({
    'any.required': 'MONGODB_URI is required. Set it in your .env file.',
  }),
  JWT_SECRET: Joi.string().required().min(8).messages({
    'any.required': 'JWT_SECRET is required. Set it in your .env file.',
    'string.min': 'JWT_SECRET must be at least 8 characters long.',
  }),
  JWT_EXPIRES_IN: Joi.string().default('7d'),
  TELEGRAM_BOT_TOKEN: Joi.string().optional().allow(''),
  TELEGRAM_BOT_USERNAME: Joi.string().optional().allow(''),
  TELEGRAM_WEBHOOK_SECRET: Joi.string().optional().allow(''),
});
