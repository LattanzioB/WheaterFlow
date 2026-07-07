export default () => ({
  port: parseInt(process.env.PORT ?? '3000', 10) || 3000,
  notificationsPort:
    parseInt(process.env.NOTIFICATIONS_PORT ?? '3001', 10) || 3001,
  database: {
    uri: process.env.MONGODB_URI,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN,
    botUsername: process.env.TELEGRAM_BOT_USERNAME,
    webhookSecret: process.env.TELEGRAM_WEBHOOK_SECRET,
  },
  notifications: {
    serviceUrl: process.env.NOTIFICATION_SERVICE_URL,
  },
  ingestion: {
    systemToken: process.env.INGESTION_SYSTEM_TOKEN,
    serviceUrl: process.env.INGESTION_SERVICE_URL,
    timeoutMs: parseInt(process.env.INGESTION_TIMEOUT_MS ?? '5000', 10),
    concurrencyLimit: parseInt(
      process.env.INGESTION_CONCURRENCY_LIMIT ?? '10',
      10,
    ),
    breakerFailureThreshold: parseInt(
      process.env.INGESTION_BREAKER_FAILURE_THRESHOLD ?? '3',
      10,
    ),
    breakerOpenMs: parseInt(
      process.env.INGESTION_BREAKER_OPEN_MS ?? '30000',
      10,
    ),
    retryAttempts: parseInt(process.env.INGESTION_RETRY_ATTEMPTS ?? '1', 10),
    retryBaseDelayMs: parseInt(
      process.env.INGESTION_RETRY_BASE_DELAY_MS ?? '100',
      10,
    ),
  },
  rabbitmq: {
    url: process.env.RABBITMQ_URL,
    alertExchange: process.env.RABBITMQ_ALERT_EXCHANGE || 'weatherflow.alerts',
    alertQueue:
      process.env.RABBITMQ_ALERT_QUEUE || 'weatherflow.notifications.alerts',
    alertRoutingKey:
      process.env.RABBITMQ_ALERT_ROUTING_KEY || 'alerts.climate.detected',
  },
});
