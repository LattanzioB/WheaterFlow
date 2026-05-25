import { AlertType } from '../../../measurements/domain/value-objects/alert-type.enum';
import { User } from '../../domain/entities/user.entity';
import { Email } from '../../domain/value-objects/email.value-object';
import { IUserRepository } from '../../domain/ports/user-repository.port';
import { INotificationServiceClient } from '../../domain/ports/notification-service-client.port';
import { UpdateDeliveryChannelsService } from './update-delivery-channels.service';
import { UserNotificationProfileService } from './user-notification-profile.service';

describe('UpdateDeliveryChannelsService', () => {
  const buildUserRepository = (): jest.Mocked<IUserRepository> => ({
    findById: jest.fn(),
    findByEmail: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
    findAll: jest.fn(),
  });

  const buildNotificationClient =
    (): jest.Mocked<INotificationServiceClient> => ({
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

  it('updates the telegram delivery channel when present', async () => {
    const userRepository = buildUserRepository();
    const notificationClient = buildNotificationClient();
    const service = new UpdateDeliveryChannelsService(
      userRepository,
      notificationClient,
      new UserNotificationProfileService(notificationClient),
    );
    const user = buildUser();

    userRepository.findById.mockResolvedValue(user);
    notificationClient.updateDeliveryChannels.mockResolvedValue({
      userId: 'user-1',
      notificationPreferences: [
        {
          stationId: 'station-1',
          alertTypes: [AlertType.STORM],
        },
      ],
      deliveryChannels: {
        telegram: { chatId: '98765' },
        log: { enabled: true },
        inApp: false,
      },
    });

    const result = await service.execute({
      userId: 'user-1',
      deliveryChannels: {
        telegram: {
          chatId: '98765',
        },
      },
    });

    expect(result.notificationProfile.deliveryChannels).toEqual({
      telegram: { chatId: '98765' },
      log: { enabled: true },
      inApp: false,
    });
    expect(notificationClient.updateDeliveryChannels).toHaveBeenCalledWith({
      userId: 'user-1',
      deliveryChannels: {
        telegram: {
          chatId: '98765',
        },
      },
    });
    expect(userRepository.save.mock.calls).toHaveLength(0);
  });

  it('forwards in-app channel updates to the Notification service', async () => {
    const userRepository = buildUserRepository();
    const notificationClient = buildNotificationClient();
    const service = new UpdateDeliveryChannelsService(
      userRepository,
      notificationClient,
      new UserNotificationProfileService(notificationClient),
    );

    userRepository.findById.mockResolvedValue(buildUser());
    notificationClient.updateDeliveryChannels.mockResolvedValue({
      userId: 'user-1',
      notificationPreferences: [],
      deliveryChannels: {
        telegram: { chatId: null },
        log: { enabled: true },
        inApp: true,
      },
    });

    await service.execute({
      userId: 'user-1',
      deliveryChannels: {
        inApp: true,
      },
    });

    expect(notificationClient.updateDeliveryChannels).toHaveBeenCalledWith({
      userId: 'user-1',
      deliveryChannels: {
        inApp: true,
      },
    });
  });

  it('rejects unknown users', async () => {
    const userRepository = buildUserRepository();
    const notificationClient = buildNotificationClient();
    const service = new UpdateDeliveryChannelsService(
      userRepository,
      notificationClient,
      new UserNotificationProfileService(notificationClient),
    );

    userRepository.findById.mockResolvedValue(null);

    await expect(
      service.execute({
        userId: 'missing',
        deliveryChannels: {
          telegram: {
            chatId: '98765',
          },
        },
      }),
    ).rejects.toThrow('User not found');
  });
});
