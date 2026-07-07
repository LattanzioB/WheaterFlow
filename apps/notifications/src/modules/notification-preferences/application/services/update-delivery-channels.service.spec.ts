import { UserNotificationProfile } from '../../domain/entities/user-notification-profile.entity';
import { INotificationProfileRepository } from '../../domain/ports/notification-profile-repository.port';
import { NotificationProfileAccessService } from './notification-profile-access.service';
import { UpdateDeliveryChannelsService } from './update-delivery-channels.service';

describe('UpdateDeliveryChannelsService', () => {
  const buildProfileRepository =
    (): jest.Mocked<INotificationProfileRepository> => ({
      findByUserId: jest.fn(),
      findByTelegramLinkCode: jest.fn(),
      findSubscribersByStationId: jest.fn(),
      findPage: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    });

  it('updates in-app delivery when the field is provided', async () => {
    const profile = UserNotificationProfile.create({ userId: 'user-1' });
    const profileAccessService = {
      getOrCreate: jest.fn().mockResolvedValue(profile),
    } as unknown as jest.Mocked<NotificationProfileAccessService>;
    const profileRepository = buildProfileRepository();
    const service = new UpdateDeliveryChannelsService(
      profileAccessService,
      profileRepository,
    );

    const updated = await service.execute({
      userId: 'user-1',
      deliveryChannels: {
        inApp: false,
      },
    });

    expect(profileAccessService.getOrCreate).toHaveBeenCalledWith('user-1');
    expect(updated.getDeliveryChannels().inApp).toBe(false);
    expect(profileRepository.save).toHaveBeenCalledWith(updated);
  });

  it('leaves in-app delivery unchanged when the field is absent', async () => {
    const profile = UserNotificationProfile.create({
      userId: 'user-1',
      deliveryChannels: {
        inApp: false,
      },
    });
    const profileAccessService = {
      getOrCreate: jest.fn().mockResolvedValue(profile),
    } as unknown as jest.Mocked<NotificationProfileAccessService>;
    const profileRepository = buildProfileRepository();
    const service = new UpdateDeliveryChannelsService(
      profileAccessService,
      profileRepository,
    );

    await service.execute({
      userId: 'user-1',
      deliveryChannels: {
        log: { enabled: true },
      },
    });

    expect(profile.getDeliveryChannels()).toEqual({
      telegram: { chatId: null },
      log: { enabled: true },
      inApp: false,
    });
  });
});
