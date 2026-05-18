import configuration from './configuration';

describe('configuration factory', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  // EC-11
  it('should return an object', () => {
    process.env.PORT = '4000';
    process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
    process.env.JWT_SECRET = 'test-secret-key';
    process.env.JWT_EXPIRES_IN = '1d';
    process.env.TELEGRAM_BOT_TOKEN = 'test-token';
    process.env.TELEGRAM_BOT_USERNAME = 'weatherflow_bot';
    process.env.TELEGRAM_WEBHOOK_SECRET = 'secret-token';
    process.env.NOTIFICATIONS_PORT = '4001';
    process.env.NOTIFICATION_SERVICE_URL = 'http://notifications:3001';
    process.env.NOTIFICATION_DELIVERY_MODE = 'log';
    process.env.RABBITMQ_URL = 'amqp://weatherflow:weatherflow@rabbitmq:5672';
    process.env.RABBITMQ_ALERT_EXCHANGE = 'weatherflow.alerts';
    process.env.RABBITMQ_ALERT_QUEUE = 'weatherflow.notifications.alerts';
    process.env.RABBITMQ_ALERT_ROUTING_KEY = 'alerts.climate.detected';

    const config = configuration();
    expect(typeof config).toBe('object');
  });

  // EC-12
  it('should map PORT to port as a number', () => {
    process.env.PORT = '4000';
    const config = configuration();
    expect(config.port).toBe(4000);
    expect(typeof config.port).toBe('number');
  });

  // EC-13
  it('should map MONGODB_URI to database.uri', () => {
    process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
    const config = configuration();
    expect(config.database.uri).toBe('mongodb://localhost:27017/test');
  });

  // EC-14
  it('should map JWT_SECRET to jwt.secret', () => {
    process.env.JWT_SECRET = 'my-super-secret';
    const config = configuration();
    expect(config.jwt.secret).toBe('my-super-secret');
  });

  // EC-15
  it('should map JWT_EXPIRES_IN to jwt.expiresIn', () => {
    process.env.JWT_EXPIRES_IN = '24h';
    const config = configuration();
    expect(config.jwt.expiresIn).toBe('24h');
  });

  // EC-16
  it('should map TELEGRAM_BOT_TOKEN to telegram.botToken', () => {
    process.env.TELEGRAM_BOT_TOKEN = 'bot123:token';
    const config = configuration();
    expect(config.telegram.botToken).toBe('bot123:token');
  });

  // EC-17
  it('should default port to 3000 when PORT is not set', () => {
    delete process.env.PORT;
    const config = configuration();
    expect(config.port).toBe(3000);
  });

  it('should map NOTIFICATIONS_PORT to notificationsPort as a number', () => {
    process.env.NOTIFICATIONS_PORT = '4001';
    const config = configuration();
    expect(config.notificationsPort).toBe(4001);
  });

  // EC-18
  it('should default jwt.expiresIn to "7d" when JWT_EXPIRES_IN is not set', () => {
    delete process.env.JWT_EXPIRES_IN;
    const config = configuration();
    expect(config.jwt.expiresIn).toBe('7d');
  });

  it('should map Telegram bot metadata when provided', () => {
    process.env.TELEGRAM_BOT_USERNAME = 'weatherflow_bot';
    process.env.TELEGRAM_WEBHOOK_SECRET = 'secret-token';

    const config = configuration();

    expect(config.telegram.botUsername).toBe('weatherflow_bot');
    expect(config.telegram.webhookSecret).toBe('secret-token');
  });

  it('should map notification service runtime options', () => {
    process.env.NOTIFICATION_SERVICE_URL = 'http://notifications:3001';
    process.env.NOTIFICATION_DELIVERY_MODE = 'telegram';

    const config = configuration();

    expect(config.notifications.serviceUrl).toBe('http://notifications:3001');
    expect(config.notifications.deliveryMode).toBe('telegram');
  });

  it('should map RabbitMQ alert topology', () => {
    process.env.RABBITMQ_URL = 'amqp://weatherflow:weatherflow@rabbitmq:5672';
    process.env.RABBITMQ_ALERT_EXCHANGE = 'weatherflow.alerts';
    process.env.RABBITMQ_ALERT_QUEUE = 'weatherflow.notifications.alerts';
    process.env.RABBITMQ_ALERT_ROUTING_KEY = 'alerts.climate.detected';

    const config = configuration();

    expect(config.rabbitmq).toEqual({
      url: 'amqp://weatherflow:weatherflow@rabbitmq:5672',
      alertExchange: 'weatherflow.alerts',
      alertQueue: 'weatherflow.notifications.alerts',
      alertRoutingKey: 'alerts.climate.detected',
    });
  });

  // EC-19
  it('should use camelCase keys (not SCREAMING_SNAKE)', () => {
    process.env.PORT = '3000';
    process.env.MONGODB_URI = 'mongodb://localhost/test';
    process.env.JWT_SECRET = 'secret12';
    process.env.JWT_EXPIRES_IN = '7d';
    process.env.TELEGRAM_BOT_TOKEN = 'tok';

    const config = configuration();
    const keys = Object.keys(config);
    expect(keys).toEqual(
      expect.arrayContaining([
        'port',
        'notificationsPort',
        'database',
        'jwt',
        'telegram',
        'notifications',
        'rabbitmq',
      ]),
    );
    expect(config.database).toHaveProperty('uri');
    expect(config.jwt).toHaveProperty('secret');
    expect(config.jwt).toHaveProperty('expiresIn');
    expect(config.telegram).toHaveProperty('botToken');
    expect(config.telegram).toHaveProperty('botUsername');
    expect(config.telegram).toHaveProperty('webhookSecret');
    expect(config.notifications).toHaveProperty('serviceUrl');
    expect(config.notifications).toHaveProperty('deliveryMode');
    expect(config.rabbitmq).toHaveProperty('url');
    expect(config.rabbitmq).toHaveProperty('alertExchange');
    expect(config.rabbitmq).toHaveProperty('alertQueue');
    expect(config.rabbitmq).toHaveProperty('alertRoutingKey');
  });
});
