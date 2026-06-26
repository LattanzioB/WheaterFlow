import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import request, {
  type SuperTest,
  type Test as SuperTestRequest,
} from 'supertest';
import { connect, type Channel, type ChannelModel } from 'amqplib';
import { MongoClient } from 'mongodb';
import axios from 'axios';
import { AlertType, type ClimateAlertDetectedMessage } from '@contracts';
import { ALERT_NOTIFIER_TOKEN } from '@shared/tokens/injection-tokens';
import { RecordingAlertNotifier } from './recording-alert-notifier';
import {
  resolveIntegrationTestEnvironment,
  type IntegrationTestEnvironment,
} from './integration-test-environment';
import { RunIngestionCycleService } from '../../apps/ingestion/src/modules/ingestion/application/services/run-ingestion-cycle.service';
import { ApiMeasurementSubmitterAdapter } from '../../apps/ingestion/src/modules/ingestion/infrastructure/adapters/api-measurement-submitter.adapter';

interface StartedApplication {
  app: INestApplication;
  baseUrl: string;
}

interface StartedIntegrationStack {
  api: StartedApplication;
  notifications: StartedApplication;
  fakeNotifier: RecordingAlertNotifier;
}

interface RegisteredUser {
  token: string;
  userId: string;
}

const environmentCheck = resolveIntegrationTestEnvironment(process.env);
const describeIntegration = environmentCheck.ready ? describe : describe.skip;
const testCollections = [
  'users',
  'weather_stations',
  'measurements',
  'user_notification_profiles',
  'notifications',
];

describeIntegration('WeatherFlow cross-service integration', () => {
  let environment: IntegrationTestEnvironment;
  let exchange: string;
  let queue: string;
  let probeQueue: string;
  let routingKey: string;
  let rabbitConnection: ChannelModel;
  let rabbitChannel: Channel;
  let stack: StartedIntegrationStack;

  beforeAll(() => {
    environment = environmentCheck.require();
  });

  beforeEach(async () => {
    const runId = randomUUID();
    exchange = `${environment.alertExchange}.${runId}`;
    queue = `${environment.alertQueue}.${runId}`;
    probeQueue = `${queue}.probe`;
    routingKey = `${environment.alertRoutingKey}.${runId}`;

    process.env.MONGODB_URI = environment.mongodbUri;
    process.env.RABBITMQ_URL = environment.rabbitmqUrl;
    process.env.RABBITMQ_ALERT_EXCHANGE = exchange;
    process.env.RABBITMQ_ALERT_QUEUE = queue;
    process.env.RABBITMQ_ALERT_ROUTING_KEY = routingKey;

    await cleanMongoCollections(environment.mongodbUri);
    await prepareRabbitMq();
    stack = await startIntegrationStack();
  });

  afterEach(async () => {
    await stack?.api.app.close();
    await stack?.notifications.app.close();
    await cleanupRabbitMq();
    await cleanMongoCollections(environment.mongodbUri);
  });

  it('publishes an API alert to RabbitMQ and the Notification service consumes it through the fake notifier', async () => {
    const api = request(stack.api.baseUrl);
    const user = await registerUser(api);
    const station = await createStation(api, user.token);

    await api
      .post(`/users/${user.userId}/subscriptions/${station.id}`)
      .set('Authorization', `Bearer ${user.token}`)
      .send({ alertTypes: [AlertType.EXTREME_HEAT] })
      .expect(201);

    const notificationWait = stack.fakeNotifier.waitForNotification(
      (notification) =>
        notification.userId === user.userId &&
        notification.stationId === station.id &&
        notification.alertType === AlertType.EXTREME_HEAT,
      10_000,
    );

    const measurementResponse = await api
      .post('/measurements')
      .set('Authorization', `Bearer ${user.token}`)
      .send({
        stationId: station.id,
        temperature: 42,
        humidity: 50,
        pressure: 1012,
        reportedAt: '2026-05-22T10:00:00.000Z',
      })
      .expect(201);

    expect(measurementResponse.body).toMatchObject({
      stationId: station.id,
      temperature: 42,
      alertStatus: true,
      alertType: AlertType.EXTREME_HEAT,
    });

    const publishedMessage =
      await waitForProbeMessage<ClimateAlertDetectedMessage>(
        rabbitChannel,
        probeQueue,
      );
    expect(publishedMessage).toMatchObject({
      measurementId: getStringField(
        readResponseBody(measurementResponse),
        'id',
      ),
      stationId: station.id,
      stationName: station.name,
      alertType: AlertType.EXTREME_HEAT,
      temperature: 42,
      humidity: 50,
      pressure: 1012,
    });

    const deliveredNotification = await notificationWait;
    expect(deliveredNotification).toMatchObject({
      userId: user.userId,
      stationId: station.id,
      stationName: station.name,
      alertType: AlertType.EXTREME_HEAT,
    });
    expect(deliveredNotification.deliveryTargets).toEqual(
      expect.arrayContaining([
        { channel: 'log', destination: user.userId },
        { channel: 'in-app', destination: user.userId },
      ]),
    );
  });

  it('routes API notification preference calls to the Notification service over HTTP', async () => {
    const api = request(stack.api.baseUrl);
    const notifications = request(stack.notifications.baseUrl);
    const user = await registerUser(api);

    const apiResponse = await api
      .patch(`/users/${user.userId}/delivery-channels`)
      .set('Authorization', `Bearer ${user.token}`)
      .send({
        deliveryChannels: {
          log: { enabled: false },
          telegram: { chatId: 'integration-chat' },
        },
      })
      .expect(200);

    expect(apiResponse.body).toMatchObject({
      id: user.userId,
      deliveryChannels: {
        log: { enabled: false },
        telegram: { chatId: 'integration-chat' },
      },
    });

    const notificationProfile = await notifications
      .get(`/notification-preferences/users/${user.userId}`)
      .expect(200);

    expect(notificationProfile.body).toMatchObject({
      userId: user.userId,
      deliveryChannels: {
        log: { enabled: false },
        telegram: { chatId: 'integration-chat' },
      },
    });
  });

  it('records a simulated OpenWeather reading through API, MongoDB, and RabbitMQ without duplicating retries', async () => {
    const api = request(stack.api.baseUrl);
    const user = await registerUser(api);
    const station = await createStation(api, user.token, 'openweather');

    await api
      .post(`/users/${user.userId}/subscriptions/${station.id}`)
      .set('Authorization', `Bearer ${user.token}`)
      .send({ alertTypes: [AlertType.EXTREME_HEAT] })
      .expect(201);

    const notificationWait = stack.fakeNotifier.waitForNotification(
      (notification) =>
        notification.userId === user.userId &&
        notification.stationId === station.id &&
        notification.alertType === AlertType.EXTREME_HEAT,
      10_000,
    );
    const submitter = new ApiMeasurementSubmitterAdapter(
      axios.create({
        baseURL: stack.api.baseUrl,
        headers: {
          'x-ingestion-token': process.env.INGESTION_SYSTEM_TOKEN,
        },
      }),
    );
    const cycle = new RunIngestionCycleService(
      {
        listOpenWeatherStations: jest.fn().mockResolvedValue([
          {
            id: station.id,
            name: station.name,
            location: { latitude: -34.6037, longitude: -58.3816 },
            status: 'Activa',
            provider: 'openweather',
          },
        ]),
      },
      {
        getCurrentWeather: jest.fn().mockResolvedValue({
          externalId: 'owm-observation-1',
          temperature: { value: 42, unit: 'celsius' },
          humidity: { value: 50, unit: 'percent' },
          pressure: { value: 1012, unit: 'hPa' },
          observedAt: new Date('2026-06-25T12:00:00.000Z'),
        }),
      },
      submitter,
      1,
    );

    const firstRun = await cycle.execute('manual');
    const publishedMessage =
      await waitForProbeMessage<ClimateAlertDetectedMessage>(
        rabbitChannel,
        probeQueue,
      );

    expect(firstRun).toMatchObject({
      succeeded: 1,
      failed: 0,
    });
    const firstResult = firstRun.results[0];

    if (firstResult.status !== 'succeeded') {
      throw new Error('Expected the simulated OpenWeather reading to succeed');
    }

    expect(firstResult.measurement).toMatchObject({
      stationId: station.id,
      source: 'openweather',
      alertStatus: true,
    });
    expect(publishedMessage).toMatchObject({
      stationId: station.id,
      correlationId: firstRun.cycleId,
      temperature: 42,
    });
    await expect(notificationWait).resolves.toMatchObject({
      userId: user.userId,
      stationId: station.id,
    });

    const secondRun = await cycle.execute('manual');
    const secondResult = secondRun.results[0];

    if (secondResult.status !== 'succeeded') {
      throw new Error('Expected the idempotent retry to succeed');
    }

    expect(secondResult.measurement.id).toBe(firstResult.measurement.id);
    await expect(
      countMeasurements(environment.mongodbUri, station.id),
    ).resolves.toBe(1);
  });

  async function prepareRabbitMq(): Promise<void> {
    rabbitConnection = await connect(environment.rabbitmqUrl);
    rabbitChannel = await rabbitConnection.createChannel();

    await rabbitChannel.assertExchange(exchange, 'topic', { durable: true });
    await rabbitChannel.assertQueue(queue, { durable: true });
    await rabbitChannel.bindQueue(queue, exchange, routingKey);
    await rabbitChannel.purgeQueue(queue);
    await rabbitChannel.assertQueue(probeQueue, {
      durable: false,
      autoDelete: true,
    });
    await rabbitChannel.bindQueue(probeQueue, exchange, routingKey);
    await rabbitChannel.purgeQueue(probeQueue);
  }

  async function cleanupRabbitMq(): Promise<void> {
    await rabbitChannel?.deleteQueue(probeQueue).catch(() => undefined);
    await rabbitChannel?.deleteQueue(queue).catch(() => undefined);
    await rabbitChannel?.deleteExchange(exchange).catch(() => undefined);
    await rabbitChannel?.close().catch(() => undefined);
    await rabbitConnection?.close().catch(() => undefined);
  }
});

function applyGlobalPipes(app: INestApplication): void {
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
}

async function startIntegrationStack(): Promise<StartedIntegrationStack> {
  const fakeNotifier = new RecordingAlertNotifier();
  const notificationsModuleImport =
    (await import('../../apps/notifications/src/notifications-app.module')) as typeof import('../../apps/notifications/src/notifications-app.module');
  const notificationsModule = await Test.createTestingModule({
    imports: [notificationsModuleImport.NotificationsAppModule],
  })
    .overrideProvider(ALERT_NOTIFIER_TOKEN)
    .useValue(fakeNotifier)
    .compile();
  const notifications = await startNestApplication(notificationsModule);

  process.env.NOTIFICATION_SERVICE_URL = notifications.baseUrl;

  const apiModuleImport =
    (await import('../../apps/api/src/app.module')) as typeof import('../../apps/api/src/app.module');
  const apiModule = await Test.createTestingModule({
    imports: [apiModuleImport.AppModule],
  }).compile();
  const api = await startNestApplication(apiModule);

  return {
    api,
    notifications,
    fakeNotifier,
  };
}

async function startNestApplication(
  module: TestingModule,
): Promise<StartedApplication> {
  const app = module.createNestApplication();
  applyGlobalPipes(app);
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

async function registerUser(
  api: SuperTest<SuperTestRequest>,
): Promise<RegisteredUser> {
  const email = `integration-${randomUUID()}@weatherflow.test`;
  const registerResponse = await api
    .post('/auth/register')
    .send({
      name: 'Integration',
      lastName: 'Tester',
      email,
      password: 'secure123',
    })
    .expect(201);
  const token = getStringField(
    readResponseBody(registerResponse),
    'access_token',
  );
  const profileResponse = await api
    .get('/users/me')
    .set('Authorization', `Bearer ${token}`)
    .expect(200);

  return {
    token,
    userId: getStringField(readResponseBody(profileResponse), 'id'),
  };
}

async function createStation(
  api: SuperTest<SuperTestRequest>,
  token: string,
  provider = 'none',
): Promise<{ id: string; name: string }> {
  const stationName = `Integration Station ${randomUUID()}`;
  const stationResponse = await api
    .post('/weather-stations')
    .set('Authorization', `Bearer ${token}`)
    .send({
      name: stationName,
      location: {
        latitude: -34.6037,
        longitude: -58.3816,
      },
      sensorModel: 'BME280',
      provider,
      alertSettings: {
        extremeHeat: true,
        frost: false,
        storm: false,
        criticalHumidity: false,
      },
    })
    .expect(201);
  const stationBody = readResponseBody(stationResponse);

  return {
    id: getStringField(stationBody, 'id'),
    name: getStringField(stationBody, 'name'),
  };
}

async function countMeasurements(
  mongodbUri: string,
  stationId: string,
): Promise<number> {
  const client = new MongoClient(mongodbUri);
  await client.connect();

  try {
    return await client.db().collection('measurements').countDocuments({
      stationId,
    });
  } finally {
    await client.close();
  }
}

async function waitForProbeMessage<T>(
  channel: Channel,
  queue: string,
  timeoutMs = 10_000,
  intervalMs = 100,
): Promise<T> {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const message = await channel.get(queue, { noAck: false });

    if (message) {
      channel.ack(message);
      return JSON.parse(message.content.toString('utf8')) as T;
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error('Timed out waiting for RabbitMQ probe message');
}

function readResponseBody(response: {
  body: unknown;
}): Record<string, unknown> {
  if (
    response.body === null ||
    typeof response.body !== 'object' ||
    Array.isArray(response.body)
  ) {
    throw new Error('Expected response body to be an object');
  }

  return response.body as Record<string, unknown>;
}

function getStringField(
  record: Record<string, unknown>,
  field: string,
): string {
  const value = record[field];

  if (typeof value !== 'string') {
    throw new Error(`Expected response field ${field} to be a string`);
  }

  return value;
}
