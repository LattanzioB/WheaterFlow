import { Email } from '../../domain/value-objects/email.value-object';
import { UserRole } from '../../domain/value-objects/user-role.enum';
import { User } from '../../domain/entities/user.entity';
import { MongoUserRepository } from './mongo-user.repository';

describe('MongoUserRepository', () => {
  const buildQuery = <T>(result: T) => ({
    lean: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue(result),
  });

  const buildModel = () =>
    ({
      findById: jest.fn(),
      findOne: jest.fn(),
      replaceOne: jest.fn(),
      deleteOne: jest.fn(),
      find: jest.fn(),
    }) as any;

  const userDocument = {
    _id: 'user-1',
    name: 'Bruno',
    lastName: 'Lattanzio',
    email: 'bruno@example.com',
    passwordHash: 'hash',
    role: UserRole.USER,
    createdAt: new Date('2026-04-25T18:00:00.000Z'),
  };

  it('loads a user by email and maps it to the domain entity', async () => {
    const model = buildModel();
    const query = buildQuery(userDocument);
    const repository = new MongoUserRepository(model);

    model.findOne.mockReturnValue(query);

    const user = await repository.findByEmail(
      Email.create('bruno@example.com'),
    );

    expect(model.findOne).toHaveBeenCalledWith({ email: 'bruno@example.com' });
    expect(user?.getId()).toBe('user-1');
    expect(user?.getName()).toBe('Bruno');
  });

  it('upserts the mapped persistence document when saving', async () => {
    const model = buildModel();
    const repository = new MongoUserRepository(model);
    const aggregate = User.create({
      id: 'user-2',
      name: 'Ana',
      lastName: 'Owner',
      email: Email.create('ana@example.com'),
      passwordHash: 'hashed-password',
      role: UserRole.ADMIN,
      createdAt: new Date('2026-04-25T19:00:00.000Z'),
    });

    model.replaceOne.mockResolvedValue({ acknowledged: true });

    await repository.save(aggregate);

    expect(model.replaceOne).toHaveBeenCalledWith(
      { _id: 'user-2' },
      {
        _id: 'user-2',
        name: 'Ana',
        lastName: 'Owner',
        email: 'ana@example.com',
        passwordHash: 'hashed-password',
        role: UserRole.ADMIN,
        createdAt: new Date('2026-04-25T19:00:00.000Z'),
      },
      { upsert: true },
    );
  });
});
