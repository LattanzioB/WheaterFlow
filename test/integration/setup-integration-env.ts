import { config } from 'dotenv';

config({ path: '.env.integration', quiet: true });

process.env.NODE_ENV = process.env.NODE_ENV ?? 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'integration-test-secret';
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? '1h';
process.env.NOTIFICATION_DELIVERY_MODE =
  process.env.NOTIFICATION_DELIVERY_MODE ?? 'log';
process.env.TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? '';
process.env.TELEGRAM_BOT_USERNAME = process.env.TELEGRAM_BOT_USERNAME ?? '';
process.env.TELEGRAM_WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET ?? '';
process.env.INGESTION_SYSTEM_TOKEN =
  process.env.INGESTION_SYSTEM_TOKEN ?? 'integration-ingestion-token';
