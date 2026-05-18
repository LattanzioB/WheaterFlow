import { User } from '@api/modules/users/domain/entities/user.entity';
import { Email } from '@api/modules/users/domain/value-objects/email.value-object';
import type { IUserRepository } from '@api/modules/users/domain/ports/user-repository.port';
import { ProcessTelegramWebhookService } from './process-telegram-webhook.service';

describe('ProcessTelegramWebhookService', () => {
  const buildUserRepository = (): jest.Mocked<IUserRepository> => ({
    findById: jest.fn(),
    findByEmail: jest.fn(),
    findByTelegramLinkCode: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
    findAll: jest.fn(),
    findSubscribersByStationId: jest.fn(),
  });

  it('links a Telegram chat id when a valid /link command is received', async () => {
    const userRepository = buildUserRepository();
    const user = User.create({
      id: 'user-1',
      name: 'Bruno',
      lastName: 'Lattanzio',
      email: Email.create('bruno@example.com'),
      passwordHash: 'hash',
      telegramLinking: {
        code: 'WF-A1B2C3D4',
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      },
    });
    const service = new ProcessTelegramWebhookService(userRepository);

    userRepository.findByTelegramLinkCode.mockResolvedValue(user);

    await expect(
      service.execute({
        message: {
          text: '/link WF-A1B2C3D4',
          chat: {
            id: 123456789,
          },
        },
      }),
    ).resolves.toBe('linked');

    expect(user.getDeliveryChannels()).toEqual({
      telegram: {
        chatId: '123456789',
      },
    });
    expect(user.getTelegramLinking()).toEqual({
      code: null,
      expiresAt: null,
    });
    expect(userRepository.save).toHaveBeenCalledWith(user);
  });

  it('ignores unrelated Telegram messages', async () => {
    const service = new ProcessTelegramWebhookService(buildUserRepository());

    await expect(
      service.execute({
        message: {
          text: 'hello there',
          chat: {
            id: 123456789,
          },
        },
      }),
    ).resolves.toBe('ignored');
  });

  it('rejects expired Telegram link codes', async () => {
    const userRepository = buildUserRepository();
    const user = User.create({
      id: 'user-1',
      name: 'Bruno',
      lastName: 'Lattanzio',
      email: Email.create('bruno@example.com'),
      passwordHash: 'hash',
      telegramLinking: {
        code: 'WF-OLD',
        expiresAt: new Date('2026-04-25T12:00:00.000Z'),
      },
    });
    const service = new ProcessTelegramWebhookService(userRepository);

    userRepository.findByTelegramLinkCode.mockResolvedValue(user);

    await expect(
      service.execute({
        message: {
          text: '/link WF-OLD',
          chat: {
            id: 123456789,
          },
        },
      }),
    ).resolves.toBe('expired-code');

    expect(userRepository.save).not.toHaveBeenCalled();
  });
});
