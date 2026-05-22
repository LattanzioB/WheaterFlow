import { UserNotificationProfile } from '../../../notification-preferences/domain/entities/user-notification-profile.entity';
import { INotificationProfileRepository } from '../../../notification-preferences/domain/ports/notification-profile-repository.port';
import { ProcessTelegramWebhookService } from './process-telegram-webhook.service';

describe('ProcessTelegramWebhookService', () => {
  const buildRepository = (): jest.Mocked<INotificationProfileRepository> => ({
    findByUserId: jest.fn(),
    findByTelegramLinkCode: jest.fn(),
    findSubscribersByStationId: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
  });

  it('links a telegram chat when the code is valid', async () => {
    const repository = buildRepository();
    const service = new ProcessTelegramWebhookService(repository);
    const profile = UserNotificationProfile.create({
      userId: 'user-1',
      telegramLinking: {
        code: 'WF-AB12CD34',
        expiresAt: new Date(Date.now() + 60_000),
      },
    });

    repository.findByTelegramLinkCode.mockResolvedValue(profile);

    await expect(
      service.execute({
        message: {
          text: '/link WF-AB12CD34',
          chat: { id: 12345 },
        },
      }),
    ).resolves.toBe('linked');

    expect(repository.save.mock.calls).toEqual([[profile]]);
    expect(profile.getDeliveryChannels().telegram.chatId).toBe('12345');
  });

  it('ignores unrelated webhook messages', async () => {
    const repository = buildRepository();
    const service = new ProcessTelegramWebhookService(repository);

    await expect(
      service.execute({
        message: {
          text: 'hello',
          chat: { id: 12345 },
        },
      }),
    ).resolves.toBe('ignored');
  });
});
