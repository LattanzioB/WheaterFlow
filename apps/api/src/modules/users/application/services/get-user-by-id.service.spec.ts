import { IUserRepository } from '../../domain/ports/user-repository.port';
import { INotificationServiceClient } from '../../domain/ports/notification-service-client.port';
import { GetUserByIdService } from './get-user-by-id.service';
import { User } from '../../domain/entities/user.entity';
import { Email } from '../../domain/value-objects/email.value-object';
import { UserNotificationProfileService } from './user-notification-profile.service';

describe('GetUserByIdService', () => {
  const buildUserRepository = (): jest.Mocked<IUserRepository> => ({
    findById: jest.fn(),
    findByEmail: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
    findAll: jest.fn(),
  });

  const buildNotificationClient = (): jest.Mocked<INotificationServiceClient> => ({
    getProfile: jest.fn(),
    listSubscriptions: jest.fn(),
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
    updateAlertPreferences: jest.fn(),
    updateDeliveryChannels: jest.fn(),
    createTelegramLinkCode: jest.fn(),
  });

  const buildUser = () =>
    User.create({
      id: 'user-1',
      name: 'Bruno',
      lastName: 'Lattanzio',
      email: Email.create('bruno@example.com'),
      passwordHash: 'hash',
    });

  it('returns the user when it exists', async () => {
    const userRepository = buildUserRepository();
    const notificationClient = buildNotificationClient();
    const service = new GetUserByIdService(
      userRepository,
      new UserNotificationProfileService(notificationClient),
    );
    const user = buildUser();

    userRepository.findById.mockResolvedValue(user);
    notificationClient.getProfile.mockResolvedValue({
      userId: 'user-1',
      notificationPreferences: [],
      deliveryChannels: {
        telegram: { chatId: null },
        log: { enabled: true },
      },
    });

    await expect(service.execute('user-1')).resolves.toEqual({
      user,
      notificationProfile: {
        userId: 'user-1',
        notificationPreferences: [],
        deliveryChannels: {
          telegram: { chatId: null },
          log: { enabled: true },
        },
      },
    });
  });

  it('rejects unknown users', async () => {
    const userRepository = buildUserRepository();
    const notificationClient = buildNotificationClient();
    const service = new GetUserByIdService(
      userRepository,
      new UserNotificationProfileService(notificationClient),
    );

    userRepository.findById.mockResolvedValue(null);

    await expect(service.execute('missing')).rejects.toThrow('User not found');
  });
});
