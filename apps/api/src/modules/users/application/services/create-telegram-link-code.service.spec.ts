import { User } from '../../domain/entities/user.entity';
import { Email } from '../../domain/value-objects/email.value-object';
import type { IUserRepository } from '../../domain/ports/user-repository.port';
import type { INotificationServiceClient } from '../../domain/ports/notification-service-client.port';
import { CreateTelegramLinkCodeService } from './create-telegram-link-code.service';

describe('CreateTelegramLinkCodeService', () => {
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

  it('creates a short-lived Telegram link code for an existing user', async () => {
    const userRepository = buildUserRepository();
    const notificationClient = buildNotificationClient();
    const user = User.create({
      id: 'user-1',
      name: 'Bruno',
      lastName: 'Lattanzio',
      email: Email.create('bruno@example.com'),
      passwordHash: 'hash',
    });
    const service = new CreateTelegramLinkCodeService(
      userRepository,
      notificationClient,
    );

    userRepository.findById.mockResolvedValue(user);
    notificationClient.createTelegramLinkCode.mockResolvedValue({
      code: 'WF-AB12CD34',
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      instructions: 'Send /link WF-AB12CD34 to the WeatherFlow Telegram bot.',
    });

    const result = await service.execute({ userId: 'user-1' });

    expect(result.code).toBe('WF-AB12CD34');
    expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());
    expect(userRepository.save.mock.calls).toHaveLength(0);
  });

  it('fails when the user does not exist', async () => {
    const userRepository = buildUserRepository();
    const notificationClient = buildNotificationClient();
    const service = new CreateTelegramLinkCodeService(
      userRepository,
      notificationClient,
    );

    userRepository.findById.mockResolvedValue(null);

    await expect(service.execute({ userId: 'missing' })).rejects.toThrow(
      'User not found',
    );
  });
});
