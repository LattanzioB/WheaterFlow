import { Email } from '../../domain/value-objects/email.value-object';
import { UserRole } from '../../domain/value-objects/user-role.enum';
import { MongoUserRepository } from './mongo-user.repository';
import { AlertType } from '../../../measurements/domain/value-objects/alert-type.enum';

describe('MongoUserRepository', () => {
  const buildQuery = <T>(result: T) => ({
    lean: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue(result),
  });

  const buildModel = () =>
    ({
      findById: jest.fn(),
      findOne: jest.fn(),
      replaceOne: jest.fn(),
      deleteOne: jest.fn(),
      find: jest.fn(),
    }) as any;

  const userDocument = {
    _id: 'user-1',
    name: 'Bruno',
    lastName: 'Lattanzio',
    email: 'bruno@example.com',
    passwordHash: 'hash',
    notificationPreferences: [
      {
        stationId: 'station-1',
        alertTypes: [AlertType.STORM],
      },
    ],
    deliveryChannels: {
      telegram: {
        chatId: '12345',
      },
    },
    telegramLinking: {
      code: 'WF-AB12CD34',
      expiresAt: new Date('2026-04-25T18:10:00.000Z'),
    },
    role: UserRole.USER,
    createdAt: new Date('2026-04-25T18:00:00.000Z'),
  };

  it('loads a user by email and maps it to the domain entity', async () => {
    const model = buildModel();
    const query = buildQuery(userDocument);
    const repository = new MongoUserRepository(model);

    model.findOne.mockReturnValue(query);

    const user = await repository.findByEmail(
      Email.create('bruno@example.com'),
    );

    expect(model.findOne).toHaveBeenCalledWith({ email: 'bruno@example.com' });
    expect(user?.getId()).toBe('user-1');
    expect(user?.getDeliveryChannels()).toEqual({
      telegram: {
        chatId: '12345',
      },
    });
  });

  it('loads a user by telegram link code', async () => {
    const model = buildModel();
    const query = buildQuery(userDocument);
    const repository = new MongoUserRepository(model);

    model.findOne.mockReturnValue(query);

    const user = await repository.findByTelegramLinkCode('WF-AB12CD34');

    expect(model.findOne).toHaveBeenCalledWith({
      'telegramLinking.code': 'WF-AB12CD34',
    });
    expect(user?.getId()).toBe('user-1');
  });

  it('upserts the mapped persistence document when saving', async () => {
    const model = buildModel();
    const repository = new MongoUserRepository(model);
    const aggregate = {
      getId: () => 'user-2',
      getName: () => 'Ana',
      getLastName: () => 'Owner',
      getEmail: () => Email.create('ana@example.com'),
      getPasswordHash: () => 'hashed-password',
      getNotificationPreferences: () => [],
      getDeliveryChannels: () => ({
        telegram: {
          chatId: null,
        },
      }),
      getTelegramLinking: () => ({
        code: 'WF-NEWCODE',
        expiresAt: new Date('2026-04-25T19:10:00.000Z'),
      }),
      getRole: () => UserRole.ADMIN,
      getCreatedAt: () => new Date('2026-04-25T19:00:00.000Z'),
    } as any;

    model.replaceOne.mockResolvedValue({ acknowledged: true });

    await repository.save(aggregate);

    expect(model.replaceOne).toHaveBeenCalledWith(
      { _id: 'user-2' },
      {
        _id: 'user-2',
        name: 'Ana',
        lastName: 'Owner',
        email: 'ana@example.com',
        passwordHash: 'hashed-password',
        notificationPreferences: [],
        deliveryChannels: {
          telegram: {
            chatId: null,
          },
        },
        telegramLinking: {
          code: 'WF-NEWCODE',
          expiresAt: new Date('2026-04-25T19:10:00.000Z'),
        },
        role: UserRole.ADMIN,
        createdAt: new Date('2026-04-25T19:00:00.000Z'),
      },
      { upsert: true },
    );
  });

  it('finds station subscribers using notification preferences', async () => {
    const model = buildModel();
    const query = buildQuery([userDocument]);
    const repository = new MongoUserRepository(model);

    model.find.mockReturnValue(query);

    const subscribers =
      await repository.findSubscribersByStationId('station-1');

    expect(model.find).toHaveBeenCalledWith({
      'notificationPreferences.stationId': 'station-1',
    });
    expect(subscribers).toHaveLength(1);
    expect(subscribers[0].isSubscribedTo('station-1')).toBe(true);
  });
});
