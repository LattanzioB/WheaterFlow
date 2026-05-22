export interface IntegrationTestEnvironment {
  mongodbUri: string;
  rabbitmqUrl: string;
  alertExchange: string;
  alertQueue: string;
  alertRoutingKey: string;
}

export interface IntegrationEnvironmentCheck {
  ready: boolean;
  missing: string[];
  require(): IntegrationTestEnvironment;
}

const DEFAULT_EXCHANGE = 'weatherflow.integration.alerts';
const DEFAULT_QUEUE = 'weatherflow.integration.notifications.alerts';
const DEFAULT_ROUTING_KEY = 'alerts.integration.climate.detected';

export function resolveIntegrationTestEnvironment(
  env: NodeJS.ProcessEnv,
): IntegrationEnvironmentCheck {
  const missing = collectMissingEnvironment(env);

  return {
    ready: missing.length === 0,
    missing,
    require(): IntegrationTestEnvironment {
      if (missing.length > 0) {
        throw new Error(
          `Missing integration test environment: ${missing.join(', ')}`,
        );
      }

      return {
        mongodbUri: env.MONGODB_URI as string,
        rabbitmqUrl: env.RABBITMQ_URL as string,
        alertExchange: env.RABBITMQ_ALERT_EXCHANGE ?? DEFAULT_EXCHANGE,
        alertQueue: env.RABBITMQ_ALERT_QUEUE ?? DEFAULT_QUEUE,
        alertRoutingKey: env.RABBITMQ_ALERT_ROUTING_KEY ?? DEFAULT_ROUTING_KEY,
      };
    },
  };
}

function collectMissingEnvironment(env: NodeJS.ProcessEnv): string[] {
  const missing: string[] = [];

  if (!env.MONGODB_URI) {
    missing.push('MONGODB_URI');
  }

  if (!env.RABBITMQ_URL) {
    missing.push('RABBITMQ_URL');
  }

  if (env.WEATHERFLOW_INTEGRATION_ALLOW_DB_CLEANUP !== 'true') {
    missing.push('WEATHERFLOW_INTEGRATION_ALLOW_DB_CLEANUP=true');
  }

  return missing;
}
