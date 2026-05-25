import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, type TestingModule } from '@nestjs/testing';
import { connect, type Channel, type ChannelModel } from 'amqplib';
import { MongoClient, type Db } from 'mongodb';
import { AlertType, type ClimateAlertDetectedMessage } from '@contracts';

interface FanoutTestEnvironment {
  mongodbUri: string;
  rabbitmqUrl: string;
  alertExchange: string;
  alertQueue: string;
  alertRoutingKey: string;
}

interface StartedApplication {
  app: INestApplication;
  baseUrl: string;
}

interface SseNotificationEvent {
  event: string;
  data: Record<string, unknown>;
}

interface SseClient {
  waitForNotification(timeoutMs: number): Promise<SseNotificationEvent>;
  close(): void;
}

const DEFAULT_MONGODB_URI = 'mongodb://127.0.0.1:27017/weatherflow_integration';
const DEFAULT_RABBITMQ_URL = 'amqp://weatherflow:weatherflow@127.0.0.1:5672';
const DEFAULT_EXCHANGE = 'weatherflow.integration.alerts';
const DEFAULT_QUEUE = 'weatherflow.integration.notifications.alerts';
const DEFAULT_ROUTING_KEY = 'alerts.integration.climate.detected';
const PRE_FLIGHT_TIMEOUT_MS = 2_000;
const SSE_TIMEOUT_MS = 2_000;
const testCollections = ['user_notification_profiles', 'notifications'];

describe('Notification service in-app fanout integration', () => {
  let environment: FanoutTestEnvironment;
  let mongoClient: MongoClient;
  let database: Db;
  let rabbitConnection: ChannelModel;
  let rabbitChannel: Channel;
  let stack: StartedApplication;
  let sseClient: SseClient | undefined;
  let exchange: string;
  let queue: string;
  let routingKey: string;

  beforeAll(async () => {
    environment = resolveFanoutTestEnvironment(process.env);
    await assertIntegrationServicesReachable(environment);
    mongoClient = new MongoClient(environment.mongodbUri);
    await mongoClient.connect();
    database = mongoClient.db();
  }, 5_000);

  beforeEach(async () => {
    const runId = randomUUID();
    exchange = `${environment.alertExchange}.${runId}`;
    queue = `${environment.alertQueue}.${runId}`;
    routingKey = `${environment.alertRoutingKey}.${runId}`;

    process.env.MONGODB_URI = environment.mongodbUri;
    process.env.RABBITMQ_URL = environment.rabbitmqUrl;
    process.env.RABBITMQ_ALERT_EXCHANGE = exchange;
    process.env.RABBITMQ_ALERT_QUEUE = queue;
    process.env.RABBITMQ_ALERT_ROUTING_KEY = routingKey;
    process.env.JWT_SECRET =
      process.env.JWT_SECRET ?? 'integration-test-secret';
    process.env.NOTIFICATION_DELIVERY_MODE = 'log';

    await cleanMongoCollections(database);
    await prepareRabbitMq();
    stack = await startNotificationApplication();
  }, 10_000);

  afterEach(async () => {
    sseClient?.close();
    sseClient = undefined;
    await stack?.app.close();
    await cleanupRabbitMq();
    await cleanMongoCollections(database);
  }, 15_000);

  afterAll(async () => {
    await mongoClient?.close();
  });

  it('persists an in-app notification, streams it over SSE, and ignores duplicate message ids', async () => {
    const userId = `user-${randomUUID()}`;
    const stationId = `station-${randomUUID()}`;
    const messageId = `message-${randomUUID()}`;
    const token = stack.app.get(JwtService).sign({
      sub: userId,
      email: `${userId}@weatherflow.test`,
    });
    const message = buildClimateAlertMessage({
      messageId,
      stationId,
      alertType: AlertType.STORM,
    });

    await seedNotificationProfile({
      userId,
      stationId,
      alertType: AlertType.STORM,
    });

    sseClient = await openSseClient(stack.baseUrl, token);
    const notificationEvent = sseClient.waitForNotification(SSE_TIMEOUT_MS);

    publishClimateAlert(message);

    await expect(notificationEvent).resolves.toMatchObject({
      event: 'notification',
      data: {
        userId,
        stationId,
        messageId,
        alertType: AlertType.STORM,
      },
    });

    await expect(
      waitForNotificationDocument(userId, messageId, SSE_TIMEOUT_MS),
    ).resolves.toMatchObject({
      userId,
      stationId,
      messageId,
      alertType: AlertType.STORM,
    });

    publishClimateAlert(message);
    await expect(
      waitForNotificationCount(userId, messageId, 1, SSE_TIMEOUT_MS),
    ).resolves.toBe(1);
    await assertNotificationCountRemains(userId, messageId, 1, 500);
  });

  async function prepareRabbitMq(): Promise<void> {
    rabbitConnection = await connect(environment.rabbitmqUrl);
    rabbitChannel = await rabbitConnection.createChannel();

    await rabbitChannel.assertExchange(exchange, 'topic', { durable: true });
    await rabbitChannel.assertQueue(queue, { durable: true });
    await rabbitChannel.bindQueue(queue, exchange, routingKey);
    await rabbitChannel.purgeQueue(queue);
  }

  async function cleanupRabbitMq(): Promise<void> {
    await rabbitChannel?.deleteQueue(queue).catch(() => undefined);
    await rabbitChannel?.deleteExchange(exchange).catch(() => undefined);
    await rabbitChannel?.close().catch(() => undefined);
    await rabbitConnection?.close().catch(() => undefined);
  }

  async function seedNotificationProfile(input: {
    userId: string;
    stationId: string;
    alertType: AlertType;
  }): Promise<void> {
    await database.collection('user_notification_profiles').insertOne({
      _id: input.userId,
      notificationPreferences: [
        {
          stationId: input.stationId,
          alertTypes: [input.alertType],
        },
      ],
      deliveryChannels: {
        telegram: { chatId: null },
        log: { enabled: false },
        inApp: true,
      },
      telegramLinking: {
        code: null,
        expiresAt: null,
      },
    });
  }

  function publishClimateAlert(message: ClimateAlertDetectedMessage): void {
    rabbitChannel.publish(
      exchange,
      routingKey,
      Buffer.from(JSON.stringify(message), 'utf8'),
      {
        contentType: 'application/json',
        messageId: message.messageId,
        persistent: false,
      },
    );
  }

  async function waitForNotificationDocument(
    userId: string,
    messageId: string,
    timeoutMs: number,
  ): Promise<Record<string, unknown>> {
    const startedAt = Date.now();

    while (Date.now() - startedAt < timeoutMs) {
      const document = await database.collection('notifications').findOne({
        userId,
        messageId,
      });

      if (document) {
        return document;
      }

      await delay(50);
    }

    throw new Error(
      `Timed out waiting for persisted notification ${messageId}`,
    );
  }

  async function waitForNotificationCount(
    userId: string,
    messageId: string,
    expectedCount: number,
    timeoutMs: number,
  ): Promise<number> {
    const startedAt = Date.now();

    while (Date.now() - startedAt < timeoutMs) {
      const count = await countNotifications(userId, messageId);

      if (count === expectedCount) {
        return count;
      }

      await delay(50);
    }

    throw new Error(
      `Timed out waiting for ${expectedCount} notification row(s) for ${messageId}`,
    );
  }

  async function assertNotificationCountRemains(
    userId: string,
    messageId: string,
    expectedCount: number,
    durationMs: number,
  ): Promise<void> {
    const startedAt = Date.now();

    while (Date.now() - startedAt < durationMs) {
      const count = await countNotifications(userId, messageId);
      expect(count).toBe(expectedCount);
      await delay(50);
    }
  }

  async function countNotifications(
    userId: string,
    messageId: string,
  ): Promise<number> {
    return database.collection('notifications').countDocuments({
      userId,
      messageId,
    });
  }
});

async function startNotificationApplication(): Promise<StartedApplication> {
  const moduleImport =
    (await import('../src/notifications-app.module')) as typeof import('../src/notifications-app.module');
  const module = await Test.createTestingModule({
    imports: [moduleImport.NotificationsAppModule],
  }).compile();

  return startNestApplication(module);
}

async function startNestApplication(
  module: TestingModule,
): Promise<StartedApplication> {
  const app = module.createNestApplication();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  await app.listen(0);

  return {
    app,
    baseUrl: getBaseUrl(app),
  };
}

function getBaseUrl(app: INestApplication): string {
  const server = app.getHttpServer() as Server;
  const address = server.address();

  if (typeof address === 'string' || !address) {
    throw new Error('Nest application did not bind to a TCP port');
  }

  return `http://127.0.0.1:${address.port}`;
}

async function openSseClient(
  baseUrl: string,
  token: string,
): Promise<SseClient> {
  const abortController = new AbortController();
  const response = await fetch(
    `${baseUrl}/notifications/stream?token=${encodeURIComponent(token)}`,
    {
      headers: { Accept: 'text/event-stream' },
      signal: abortController.signal,
    },
  );

  if (!response.ok || !response.body) {
    abortController.abort();
    throw new Error(`Unable to open SSE stream: HTTP ${response.status}`);
  }

  const reader = response.body.getReader();
  const events: SseNotificationEvent[] = [];
  const waiters: Array<{
    resolve: (event: SseNotificationEvent) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }> = [];
  let buffer = '';

  void pumpSseEvents(reader, (event) => {
    if (event.event !== 'notification') {
      return;
    }

    const waiter = waiters.shift();
    if (waiter) {
      clearTimeout(waiter.timeout);
      waiter.resolve(event);
      return;
    }

    events.push(event);
  }).catch((error: unknown) => {
    if (abortController.signal.aborted) {
      return;
    }

    const waitError =
      error instanceof Error ? error : new Error('SSE stream failed');

    while (waiters.length > 0) {
      const waiter = waiters.shift();
      if (waiter) {
        clearTimeout(waiter.timeout);
        waiter.reject(waitError);
      }
    }
  });

  return {
    waitForNotification(timeoutMs: number): Promise<SseNotificationEvent> {
      const event = events.shift();
      if (event) {
        return Promise.resolve(event);
      }

      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          const index = waiters.findIndex(
            (waiter) => waiter.resolve === resolve,
          );
          if (index >= 0) {
            waiters.splice(index, 1);
          }
          reject(
            new Error(
              `Timed out waiting for notification SSE event after ${timeoutMs}ms`,
            ),
          );
        }, timeoutMs);

        waiters.push({ resolve, reject, timeout });
      });
    },
    close(): void {
      abortController.abort();
      void reader.cancel().catch(() => undefined);
      while (waiters.length > 0) {
        const waiter = waiters.shift();
        if (waiter) {
          clearTimeout(waiter.timeout);
          waiter.reject(new Error('SSE client closed'));
        }
      }
    },
  };

  async function pumpSseEvents(
    streamReader: ReadableStreamDefaultReader<Uint8Array>,
    onEvent: (event: SseNotificationEvent) => void,
  ): Promise<void> {
    const decoder = new TextDecoder();

    while (!abortController.signal.aborted) {
      const read = await streamReader.read();

      if (read.done) {
        return;
      }

      buffer += decoder.decode(read.value, { stream: true });
      const frames = buffer.split(/\r?\n\r?\n/);
      buffer = frames.pop() ?? '';

      for (const frame of frames) {
        const event = parseSseFrame(frame);
        if (event) {
          onEvent(event);
        }
      }
    }
  }
}

function parseSseFrame(frame: string): SseNotificationEvent | null {
  const eventType = readSseField(frame, 'event') ?? 'message';
  const data = readSseField(frame, 'data');

  if (!data) {
    return null;
  }

  const parsed = JSON.parse(data) as unknown;

  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Expected SSE data to be a JSON object');
  }

  return {
    event: eventType,
    data: parsed as Record<string, unknown>,
  };
}

function readSseField(frame: string, fieldName: string): string | null {
  const prefix = `${fieldName}:`;
  const line = frame
    .split(/\r?\n/)
    .find((candidate) => candidate.startsWith(prefix));

  return line ? line.slice(prefix.length).trimStart() : null;
}

function buildClimateAlertMessage(input: {
  messageId: string;
  stationId: string;
  alertType: AlertType;
}): ClimateAlertDetectedMessage {
  return {
    messageId: input.messageId,
    occurredAt: '2026-05-25T12:00:01.000Z',
    measurementId: `measurement-${randomUUID()}`,
    stationId: input.stationId,
    stationName: 'Integration Station',
    alertType: input.alertType,
    reportedAt: '2026-05-25T12:00:00.000Z',
    temperature: 24,
    humidity: 70,
    pressure: 970,
  };
}

function resolveFanoutTestEnvironment(
  env: NodeJS.ProcessEnv,
): FanoutTestEnvironment {
  return {
    mongodbUri: env.MONGODB_URI ?? DEFAULT_MONGODB_URI,
    rabbitmqUrl: env.RABBITMQ_URL ?? DEFAULT_RABBITMQ_URL,
    alertExchange: env.RABBITMQ_ALERT_EXCHANGE ?? DEFAULT_EXCHANGE,
    alertQueue: env.RABBITMQ_ALERT_QUEUE ?? DEFAULT_QUEUE,
    alertRoutingKey: env.RABBITMQ_ALERT_ROUTING_KEY ?? DEFAULT_ROUTING_KEY,
  };
}

async function assertIntegrationServicesReachable(
  environment: FanoutTestEnvironment,
): Promise<void> {
  const probes = await Promise.allSettled([
    probeMongo(environment.mongodbUri),
    probeRabbitMq(environment.rabbitmqUrl),
  ]);
  const failures = probes
    .map((result) => (result.status === 'rejected' ? result.reason : null))
    .filter((reason): reason is Error => reason instanceof Error);

  if (failures.length > 0) {
    throw new Error(
      `Integration dependencies are not reachable: ${failures
        .map((failure) => failure.message)
        .join('; ')}. Start them with docker compose up mongo rabbitmq.`,
    );
  }
}

async function probeMongo(mongodbUri: string): Promise<void> {
  const client = new MongoClient(mongodbUri, {
    serverSelectionTimeoutMS: PRE_FLIGHT_TIMEOUT_MS,
  });

  try {
    await client.connect();
    await client.db().command({ ping: 1 });
  } catch (error) {
    throw new Error(
      `MongoDB is not reachable at ${mongodbUri}: ${formatError(error)}`,
    );
  } finally {
    await client.close().catch(() => undefined);
  }
}

async function probeRabbitMq(rabbitmqUrl: string): Promise<void> {
  let connection: ChannelModel | undefined;

  try {
    connection = await withTimeout(
      connect(rabbitmqUrl),
      PRE_FLIGHT_TIMEOUT_MS,
      `RabbitMQ connection timed out at ${rabbitmqUrl}`,
    );
  } catch (error) {
    throw new Error(
      `RabbitMQ is not reachable at ${rabbitmqUrl}: ${formatError(error)}`,
    );
  } finally {
    await connection?.close().catch(() => undefined);
  }
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  message: string,
): Promise<T> {
  let timeout: NodeJS.Timeout | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_resolve, reject) => {
        timeout = setTimeout(() => reject(new Error(message)), timeoutMs);
      }),
    ]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}

async function cleanMongoCollections(database: Db): Promise<void> {
  for (const collectionName of testCollections) {
    const exists = await database
      .listCollections({ name: collectionName }, { nameOnly: true })
      .hasNext();

    if (exists) {
      await database.collection(collectionName).deleteMany({});
    }
  }
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
