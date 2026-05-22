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
    });
    expect(userRepository.save.mock.calls).toHaveLength(0);
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
