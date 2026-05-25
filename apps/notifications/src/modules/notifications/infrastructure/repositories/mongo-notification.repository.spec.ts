import { AlertType } from '@contracts/measurements/alert-type';
import { Notification } from '../../domain/entities/notification.entity';
import { MongoNotificationRepository } from './mongo-notification.repository';

describe('MongoNotificationRepository', () => {
  const buildQuery = <T>(result: T) => ({
    sort: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    lean: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue(result),
  });

  const buildModel = () =>
    ({
      createIndexes: jest.fn().mockResolvedValue(undefined),
      replaceOne: jest.fn(),
      findById: jest.fn(),
      find: jest.fn(),
      findOneAndUpdate: jest.fn(),
      updateMany: jest.fn(),
    }) as any;

  const document = {
    _id: 'notification-1',
    userId: 'user-1',
    stationId: 'station-1',
    stationName: 'Central',
    alertType: AlertType.STORM,
    temperature: 21,
    humidity: 91,
    pressure: 970,
    reportedAt: new Date('2026-05-01T10:00:00.000Z'),
    createdAt: new Date('2026-05-01T10:01:00.000Z'),
    readAt: null,
    messageId: 'message-1',
  };

  it('ensures indexes when the module initializes', async () => {
    const model = buildModel();
    const repository = new MongoNotificationRepository(model);

    await repository.onModuleInit();

    expect(model.createIndexes).toHaveBeenCalledTimes(1);
  });

  it('round-trips a saved notification through findById', async () => {
    const model = buildModel();
    const repository = new MongoNotificationRepository(model);
    const notification = Notification.create({
      id: document._id,
      userId: document.userId,
      stationId: document.stationId,
      stationName: document.stationName,
      alertType: document.alertType,
      temperature: document.temperature,
      humidity: document.humidity,
      pressure: document.pressure,
      reportedAt: document.reportedAt,
      createdAt: document.createdAt,
      readAt: document.readAt,
      messageId: document.messageId,
    });

    model.replaceOne.mockResolvedValue({ acknowledged: true });
    model.findById.mockReturnValue(buildQuery(document));

    await repository.save(notification);
    const found = await repository.findById('notification-1');

    expect(model.replaceOne).toHaveBeenCalledWith(
      { _id: 'notification-1' },
      document,
      { upsert: true },
    );
    expect(found?.getMessageId()).toBe('message-1');
  });

  it('returns null when a notification is not found by id', async () => {
    const model = buildModel();
    const repository = new MongoNotificationRepository(model);

    model.findById.mockReturnValue(buildQuery(null));

    await expect(repository.findById('missing')).resolves.toBeNull();
  });

  it('paginates notifications by user and emits a cursor when more rows exist', async () => {
    const model = buildModel();
    const repository = new MongoNotificationRepository(model);
    const secondDocument = {
      ...document,
      _id: 'notification-2',
      createdAt: new Date('2026-05-01T09:00:00.000Z'),
      messageId: 'message-2',
    };
    const findQuery = buildQuery([document, secondDocument]);

    model.find.mockReturnValue(findQuery);

    const result = await repository.findByUserId({
      userId: 'user-1',
      limit: 1,
      unreadOnly: true,
    });

    expect(model.find).toHaveBeenCalledWith({
      userId: 'user-1',
      readAt: null,
    });
    expect(findQuery.sort).toHaveBeenCalledWith({ createdAt: -1, _id: -1 });
    expect(findQuery.limit).toHaveBeenCalledWith(2);
    expect(result.notifications).toHaveLength(1);
    expect(result.nextCursor).toEqual(expect.any(String));
  });

  it('applies a decoded pagination cursor', async () => {
    const model = buildModel();
    const repository = new MongoNotificationRepository(model);
    const findQuery = buildQuery([document]);
    const cursor = Buffer.from(
      JSON.stringify({
        createdAt: '2026-05-01T10:01:00.000Z',
        id: 'notification-1',
      }),
    ).toString('base64url');

    model.find.mockReturnValue(findQuery);

    await repository.findByUserId({
      userId: 'user-1',
      limit: 10,
      cursor,
    });

    expect(model.find).toHaveBeenCalledWith({
      userId: 'user-1',
      $or: [
        { createdAt: { $lt: new Date('2026-05-01T10:01:00.000Z') } },
        {
          createdAt: new Date('2026-05-01T10:01:00.000Z'),
          _id: { $lt: 'notification-1' },
        },
      ],
    });
  });

  it('rejects invalid pagination cursors', async () => {
    const model = buildModel();
    const repository = new MongoNotificationRepository(model);

    await expect(
      repository.findByUserId({
        userId: 'user-1',
        limit: 10,
        cursor: 'not-a-cursor',
      }),
    ).rejects.toThrow('Invalid notification cursor');
  });

  it('treats duplicate key errors as idempotent saves', async () => {
    const model = buildModel();
    const repository = new MongoNotificationRepository(model);
    const notification = Notification.create({
      id: document._id,
      userId: document.userId,
      stationId: document.stationId,
      stationName: document.stationName,
      alertType: document.alertType,
      temperature: document.temperature,
      humidity: document.humidity,
      pressure: document.pressure,
      reportedAt: document.reportedAt,
      createdAt: document.createdAt,
      readAt: document.readAt,
      messageId: document.messageId,
    });

    model.replaceOne.mockRejectedValue(
      Object.assign(new Error(), { code: 11000 }),
    );

    await expect(repository.save(notification)).resolves.toBeUndefined();
  });

  it('rethrows non-duplicate save errors', async () => {
    const model = buildModel();
    const repository = new MongoNotificationRepository(model);
    const notification = Notification.create({
      id: document._id,
      userId: document.userId,
      stationId: document.stationId,
      stationName: document.stationName,
      alertType: document.alertType,
      temperature: document.temperature,
      humidity: document.humidity,
      pressure: document.pressure,
      reportedAt: document.reportedAt,
      createdAt: document.createdAt,
      readAt: document.readAt,
      messageId: document.messageId,
    });

    model.replaceOne.mockRejectedValue(new Error('write failed'));

    await expect(repository.save(notification)).rejects.toThrow('write failed');
  });

  it('marks one or all notifications as read', async () => {
    const model = buildModel();
    const repository = new MongoNotificationRepository(model);
    const readDocument = {
      ...document,
      readAt: new Date('2026-05-01T10:05:00.000Z'),
    };

    model.findOneAndUpdate.mockReturnValue(buildQuery(readDocument));
    model.updateMany.mockResolvedValue({ modifiedCount: 3 });

    const readNotification = await repository.markRead(
      'notification-1',
      'user-1',
    );
    const modifiedCount = await repository.markAllRead('user-1');

    expect(readNotification?.getReadAt()).toEqual(readDocument.readAt);
    expect(modifiedCount).toBe(3);
  });
});
