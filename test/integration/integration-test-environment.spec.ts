import { resolveIntegrationTestEnvironment } from './integration-test-environment';

describe('resolveIntegrationTestEnvironment', () => {
  it('requires MongoDB, RabbitMQ, and explicit cleanup consent', () => {
    const check = resolveIntegrationTestEnvironment({});

    expect(check.ready).toBe(false);
    expect(check.missing).toEqual([
      'MONGODB_URI',
      'RABBITMQ_URL',
      'WEATHERFLOW_INTEGRATION_ALLOW_DB_CLEANUP=true',
    ]);
    expect(() => check.require()).toThrow(
      'Missing integration test environment',
    );
  });

  it('resolves defaults for queue names when real endpoints are configured', () => {
    const check = resolveIntegrationTestEnvironment({
      MONGODB_URI: 'mongodb+srv://user:pass@example.mongodb.net/test',
      RABBITMQ_URL: 'amqp://localhost:5672',
      WEATHERFLOW_INTEGRATION_ALLOW_DB_CLEANUP: 'true',
    });

    expect(check.ready).toBe(true);
    expect(check.require()).toEqual({
      mongodbUri: 'mongodb+srv://user:pass@example.mongodb.net/test',
      rabbitmqUrl: 'amqp://localhost:5672',
      alertExchange: 'weatherflow.integration.alerts',
      alertQueue: 'weatherflow.integration.notifications.alerts',
      alertRoutingKey: 'alerts.integration.climate.detected',
    });
  });
});
