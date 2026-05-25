import { randomUUID } from 'node:crypto';
import { Server } from 'node:http';
import http from 'node:http';
import { URL } from 'node:url';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, type TestingModule } from '@nestjs/testing';
import { connect, type Channel, type ChannelModel } from 'amqplib';
import { MongoClient } from 'mongodb';
import request from 'supertest';
import { AlertType, type ClimateAlertDetectedMessage } from '@contracts';
import {
  resolveIntegrationTestEnvironment,
  type IntegrationTestEnvironment,
} from './integration-test-environment';

interface StartedApplication {
  app: INestApplication;
  baseUrl: string;
}

const environmentCheck = resolveIntegrationTestEnvironment(process.env);
const describeIntegration = environmentCheck.ready ? describe : describe.skip;
const testCollections = ['user_notification_profiles', 'notifications'];

describeIntegration('in-app notification fan-out integration', () => {
  let environment: IntegrationTestEnvironment;
  let exchange: string;
  let queue: string;
  let routingKey: string;
  let rabbitConnection: ChannelModel;
  let rabbitChannel: Channel;
  let notifications: StartedApplication;

  beforeAll(() => {
    environment = environmentCheck.require();
  });

  beforeEach(async () => {
    const runId = randomUUID();
    exchange = `${environment.alertExchange}.inapp.${runId}`;
    queue = `${environment.alertQueue}.inapp.${runId}`;
    routingKey = `${environment.alertRoutingKey}.inapp.${runId}`;

    process.env.MONGODB_URI = environment.mongodbUri;
    process.env.RABBITMQ_URL = environment.rabbitmqUrl;
    process.env.RABBITMQ_ALERT_EXCHANGE = exchange;
    process.env.RABBITMQ_ALERT_QUEUE = queue;
    process.env.RABBITMQ_ALERT_ROUTING_KEY = routingKey;
    process.env.NOTIFICATION_DELIVERY_MODE = 'log';

    await cleanMongoCollections(environment.mongodbUri);
    await prepareRabbitMq();
    notifications = await startNotificationsApp();
  });

  afterEach(async () => {
    await notifications?.app.close();
    await cleanupRabbitMq();
    await cleanMongoCollections(environment.mongodbUri);
  });

  it('persists one notification and streams it to the matching SSE subscriber', async () => {
    const userId = `user-${randomUUID()}`;
    const messageId = `message-${randomUUID()}`;
    const token = new JwtService({
      secret: process.env.JWT_SECRET,
    }).sign({
      sub: userId,
      email: `${userId}@weatherflow.test`,
    });

    await request(notifications.baseUrl)
      .post(`/notification-preferences/users/${userId}/subscriptions/station-1`)
      .send({ alertTypes: [AlertType.STORM] })
      .expect(201);

    const streamedNotification = waitForSseNotification(
      notifications.baseUrl,
      token,
      messageId,
    );

    await publishAlert({
      messageId,
      occurredAt: '2026-05-24T14:00:00.000Z',
      measurementId: `measurement-${randomUUID()}`,
      stationId: 'station-1',
      stationName: 'Central',
      alertType: AlertType.STORM,
      reportedAt: '2026-05-24T13:59:00.000Z',
      temperature: 22,
      humidity: 92,
      pressure: 970,
    });

    await expect(streamedNotification).resolves.toMatchObject({
      userId,
      stationId: 'station-1',
      messageId,
    });
    await expect(
      countNotifications(environment.mongodbUri, userId),
    ).resolves.toBe(1);

    await publishAlert({
      messageId,
      occurredAt: '2026-05-24T14:00:00.000Z',
      measurementId: `measurement-${randomUUID()}`,
      stationId: 'station-1',
      stationName: 'Central',
      alertType: AlertType.STORM,
      reportedAt: '2026-05-24T13:59:00.000Z',
      temperature: 22,
      humidity: 92,
      pressure: 970,
    });

    await waitForExpect(async () => {
      await expect(
        countNotifications(environment.mongodbUri, userId),
      ).resolves.toBe(1);
    });
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

  async function publishAlert(
    message: ClimateAlertDetectedMessage,
  ): Promise<void> {
    rabbitChannel.publish(
      exchange,
      routingKey,
      Buffer.from(JSON.stringify(message), 'utf8'),
      { contentType: 'application/json' },
    );
  }
});

async function startNotificationsApp(): Promise<StartedApplication> {
  const notificationsModuleImport =
    (await import('../../apps/notifications/src/notifications-app.module')) as typeof import('../../apps/notifications/src/notifications-app.module');
  const module = await Test.createTestingModule({
    imports: [notificationsModuleImport.NotificationsAppModule],
  }).compile();
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

function waitForSseNotification(
  baseUrl: string,
  token: string,
  messageId: string,
): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const url = new URL('/notifications/stream', baseUrl);
    url.searchParams.set('token', token);
    const request = http.get(url, (response) => {
      response.setEncoding('utf8');
      let buffer = '';

      response.on('data', (chunk: string) => {
        buffer += chunk;
        const frames = buffer.split('\n\n');
        buffer = frames.pop() ?? '';

        for (const frame of frames) {
          const event = parseSseFrame(frame);
          if (
            event.type === 'notification' &&
            event.data?.messageId === messageId
          ) {
            request.destroy();
            resolve(event.data);
          }
        }
      });
    });
    const timeout = setTimeout(() => {
      request.destroy();
      reject(new Error('Timed out waiting for SSE notification'));
    }, 10_000);

    request.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    request.on('close', () => clearTimeout(timeout));
  });
}

function parseSseFrame(frame: string): {
  type: string | null;
  data: Record<string, unknown> | null;
} {
  const lines = frame.split('\n');
  const typeLine = lines.find((line) => line.startsWith('event: '));
  const dataLine = lines.find((line) => line.startsWith('data: '));

  return {
    type: typeLine?.slice('event: '.length) ?? null,
    data: dataLine
      ? (JSON.parse(dataLine.slice('data: '.length)) as Record<string, unknown>)
      : null,
  };
}

async function waitForExpect(
  assertion: () => Promise<void>,
  timeoutMs = 10_000,
  intervalMs = 100,
): Promise<void> {
  const startedAt = Date.now();
  let lastError: unknown;

  while (Date.now() - startedAt < timeoutMs) {
    try {
      await assertion();
      return;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Timed out');
}

function getBaseUrl(app: INestApplication): string {
  const server = app.getHttpServer() as Server;
  const address = server.address();

  if (typeof address === 'string' || !address) {
    throw new Error('Nest application did not bind to a TCP port');
  }

  return `http://127.0.0.1:${address.port}`;
}

async function cleanMongoCollections(mongodbUri: string): Promise<void> {
  const client = new MongoClient(mongodbUri);

  await client.connect();

  try {
    const database = client.db();

    for (const collectionName of testCollections) {
      const exists = await database
        .listCollections({ name: collectionName }, { nameOnly: true })
        .hasNext();

      if (exists) {
        await database.collection(collectionName).deleteMany({});
      }
    }
  } finally {
    await client.close();
  }
}

async function countNotifications(
  mongodbUri: string,
  userId: string,
): Promise<number> {
  const client = new MongoClient(mongodbUri);

  await client.connect();

  try {
    return await client.db().collection('notifications').countDocuments({
      userId,
    });
  } finally {
    await client.close();
  }
}
