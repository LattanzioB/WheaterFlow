import { IUserRepository } from '../../domain/ports/user-repository.port';
import { GetUserByIdService } from './get-user-by-id.service';
import { User } from '../../domain/entities/user.entity';
import { Email } from '../../domain/value-objects/email.value-object';

describe('GetUserByIdService', () => {
  const buildUserRepository = (): jest.Mocked<IUserRepository> => ({
    findById: jest.fn(),
    findByEmail: jest.fn(),
    findByTelegramLinkCode: jest.fn(),
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
    });

  it('returns the user when it exists', async () => {
    const userRepository = buildUserRepository();
    const service = new GetUserByIdService(userRepository);
    const user = buildUser();

    userRepository.findById.mockResolvedValue(user);

    await expect(service.execute('user-1')).resolves.toBe(user);
  });

  it('rejects unknown users', async () => {
    const userRepository = buildUserRepository();
    const service = new GetUserByIdService(userRepository);

    userRepository.findById.mockResolvedValue(null);

    await expect(service.execute('missing')).rejects.toThrow('User not found');
  });
});
