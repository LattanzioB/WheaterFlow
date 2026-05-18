import { User } from '../../domain/entities/user.entity';
import { Email } from '../../domain/value-objects/email.value-object';
import type { IUserRepository } from '../../domain/ports/user-repository.port';
import { CreateTelegramLinkCodeService } from './create-telegram-link-code.service';

describe('CreateTelegramLinkCodeService', () => {
  const buildUserRepository = (): jest.Mocked<IUserRepository> => ({
    findById: jest.fn(),
    findByEmail: jest.fn(),
    findByTelegramLinkCode: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
    findAll: jest.fn(),
    findSubscribersByStationId: jest.fn(),
  });

  it('creates a short-lived Telegram link code for an existing user', async () => {
    const userRepository = buildUserRepository();
    const user = User.create({
      id: 'user-1',
      name: 'Bruno',
      lastName: 'Lattanzio',
      email: Email.create('bruno@example.com'),
      passwordHash: 'hash',
    });
    const service = new CreateTelegramLinkCodeService(userRepository);

    userRepository.findById.mockResolvedValue(user);
    userRepository.findByTelegramLinkCode.mockResolvedValue(null);

    const result = await service.execute({ userId: 'user-1' });

    expect(result.code).toMatch(/^WF-[A-F0-9]{8}$/);
    expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());
    expect(user.hasActiveTelegramLinkCode(result.code)).toBe(true);
    expect(userRepository.save).toHaveBeenCalledWith(user);
  });

  it('fails when the user does not exist', async () => {
    const userRepository = buildUserRepository();
    const service = new CreateTelegramLinkCodeService(userRepository);

    userRepository.findById.mockResolvedValue(null);

    await expect(service.execute({ userId: 'missing' })).rejects.toThrow(
      'User not found',
    );
  });
});
