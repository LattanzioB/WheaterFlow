import { IUserRepository } from '../../domain/ports/user-repository.port';
import { ListUsersService } from './list-users.service';
import { User } from '../../domain/entities/user.entity';
import { Email } from '../../domain/value-objects/email.value-object';

describe('ListUsersService', () => {
  const buildUserRepository = (): jest.Mocked<IUserRepository> => ({
    findById: jest.fn(),
    findByEmail: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
    findAll: jest.fn(),
  });

  const buildUser = (id: string, createdAt: string) =>
    User.create({
      id,
      name: 'Bruno',
      lastName: 'Lattanzio',
      email: Email.create(`${id}@example.com`),
      passwordHash: 'hash',
      createdAt: new Date(createdAt),
    });

  it('returns a page ordered by creation date with the collection total', async () => {
    const userRepository = buildUserRepository();
    const service = new ListUsersService(userRepository);

    userRepository.findAll.mockResolvedValue([
      buildUser('user-3', '2026-05-03T10:00:00.000Z'),
      buildUser('user-1', '2026-05-01T10:00:00.000Z'),
      buildUser('user-2', '2026-05-02T10:00:00.000Z'),
    ]);

    const result = await service.execute({ limit: 2, offset: 1 });

    expect(result.users.map((user) => user.getId())).toEqual([
      'user-2',
      'user-3',
    ]);
    expect(result.total).toBe(3);
    expect(result.limit).toBe(2);
    expect(result.offset).toBe(1);
  });

  it('applies default pagination when no query values are provided', async () => {
    const userRepository = buildUserRepository();
    const service = new ListUsersService(userRepository);

    userRepository.findAll.mockResolvedValue([
      buildUser('user-1', '2026-05-01T10:00:00.000Z'),
    ]);

    const result = await service.execute();

    expect(result.users).toHaveLength(1);
    expect(result.limit).toBe(20);
    expect(result.offset).toBe(0);
  });

  it('returns an empty page when the offset is beyond the collection', async () => {
    const userRepository = buildUserRepository();
    const service = new ListUsersService(userRepository);

    userRepository.findAll.mockResolvedValue([
      buildUser('user-1', '2026-05-01T10:00:00.000Z'),
    ]);

    const result = await service.execute({ limit: 10, offset: 5 });

    expect(result.users).toEqual([]);
    expect(result.total).toBe(1);
  });
});
