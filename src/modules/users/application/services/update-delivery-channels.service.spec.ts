import { AlertType } from '../../../measurements/domain/value-objects/alert-type.enum';
import { User } from '../../domain/entities/user.entity';
import { Email } from '../../domain/value-objects/email.value-object';
import { IUserRepository } from '../ports/user-repository.port';
import { UpdateDeliveryChannelsService } from './update-delivery-channels.service';

describe('UpdateDeliveryChannelsService', () => {
  const buildUserRepository = (): jest.Mocked<IUserRepository> => ({
    findById: jest.fn(),
    findByEmail: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
    findAll: jest.fn(),
    findSubscribersByStationId: jest.fn(),
  });

  const buildUser = () =>
    User.create({
      id: 'user-1',
      name: 'Bruno',
      lastName: 'Lattanzio',
      email: Email.create('bruno@example.com'),
      passwordHash: 'hash',
      notificationPreferences: [
        {
          stationId: 'station-1',
          alertTypes: [AlertType.STORM],
        },
      ],
      telegramChatId: '12345',
    });

  it('updates the telegram delivery channel when present', async () => {
    const userRepository = buildUserRepository();
    const service = new UpdateDeliveryChannelsService(userRepository);
    const user = buildUser();

    userRepository.findById.mockResolvedValue(user);

    const result = await service.execute({
      userId: 'user-1',
      telegramChatId: '98765',
    });

    expect(result.getDeliveryChannels()).toEqual({
      telegram: {
        chatId: '98765',
      },
    });
    expect(userRepository.save).toHaveBeenCalledWith(user);
  });

  it('rejects unknown users', async () => {
    const userRepository = buildUserRepository();
    const service = new UpdateDeliveryChannelsService(userRepository);

    userRepository.findById.mockResolvedValue(null);

    await expect(
      service.execute({
        userId: 'missing',
        telegramChatId: '98765',
      }),
    ).rejects.toThrow('User not found');
  });
});
