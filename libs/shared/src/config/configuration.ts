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
    deliveryMode: process.env.NOTIFICATION_DELIVERY_MODE || 'log',
  },
  ingestion: {
    systemToken: process.env.INGESTION_SYSTEM_TOKEN,
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
