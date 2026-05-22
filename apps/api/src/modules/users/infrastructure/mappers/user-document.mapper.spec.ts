import { UserRole } from '../../domain/value-objects/user-role.enum';
import { User } from '../../domain/entities/user.entity';
import { Email } from '../../domain/value-objects/email.value-object';
import { UserDocumentMapper } from './user-document.mapper';
import { UserSchema } from '../persistence/user.schema';

describe('User persistence mapping', () => {
  it('defines the user schema with the expected indexes', () => {
    expect(UserSchema.path('email')).toBeDefined();

    expect(UserSchema.indexes()).toContainEqual([
      { email: 1 },
      { unique: true },
    ]);
  });

  it('maps a user aggregate to a persistence document', () => {
    const user = User.create({
      id: 'user-1',
      name: 'Bruno',
      lastName: 'Lattanzio',
      email: Email.create('bruno@example.com'),
      passwordHash: 'hashed-password',
      role: UserRole.ADMIN,
      createdAt: new Date('2026-04-25T12:00:00.000Z'),
    });

    expect(UserDocumentMapper.toPersistence(user)).toEqual({
      _id: 'user-1',
      name: 'Bruno',
      lastName: 'Lattanzio',
      email: 'bruno@example.com',
      passwordHash: 'hashed-password',
      role: UserRole.ADMIN,
      createdAt: new Date('2026-04-25T12:00:00.000Z'),
    });
  });

  it('maps a persistence document back to the user aggregate', () => {
    const user = UserDocumentMapper.toDomain({
      _id: 'user-1',
      name: 'Ana',
      lastName: 'Owner',
      email: 'ana@example.com',
      passwordHash: 'hash',
      role: UserRole.USER,
      createdAt: new Date('2026-04-25T13:00:00.000Z'),
    });

    expect(user.getId()).toBe('user-1');
    expect(user.getEmail().getValue()).toBe('ana@example.com');
    expect(user.getCreatedAt().toISOString()).toBe('2026-04-25T13:00:00.000Z');
  });
});
