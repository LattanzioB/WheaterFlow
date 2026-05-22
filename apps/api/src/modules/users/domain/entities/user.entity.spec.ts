import { User } from './user.entity';
import { Email } from '../value-objects/email.value-object';
import { UserRole } from '../value-objects/user-role.enum';

describe('User', () => {
  it('creates a user with normalized values and a default role', () => {
    const user = User.create({
      name: ' Bruno ',
      lastName: ' Lattanzio ',
      email: Email.create('bruno@example.com'),
      passwordHash: ' hashed-password ',
    });

    expect(user.getId()).toBeTruthy();
    expect(user.getName()).toBe('Bruno');
    expect(user.getLastName()).toBe('Lattanzio');
    expect(user.getPasswordHash()).toBe('hashed-password');
    expect(user.getRole()).toBe(UserRole.USER);
    expect(user.getCreatedAt()).toBeInstanceOf(Date);
  });

  it('supports explicit roles and persisted identifiers', () => {
    const user = User.create({
      id: 'user-1',
      name: 'Ana',
      lastName: 'Owner',
      email: Email.create('ana@example.com'),
      passwordHash: 'hash',
      role: UserRole.ADMIN,
      createdAt: new Date('2026-04-25T10:00:00.000Z'),
    });

    expect(user.getRole()).toBe(UserRole.ADMIN);
    expect(user.getId()).toBe('user-1');
    expect(user.getCreatedAt().toISOString()).toBe('2026-04-25T10:00:00.000Z');
  });

  it('updates profile fields', () => {
    const user = User.create({
      name: 'Bruno',
      lastName: 'Lattanzio',
      email: Email.create('bruno@example.com'),
      passwordHash: 'hash',
    });

    user.changeName(' Bruno Updated ', ' Lattanzio Updated ');
    user.changePasswordHash(' new-hash ');
    user.assignRole(UserRole.ADMIN);

    expect(user.getName()).toBe('Bruno Updated');
    expect(user.getLastName()).toBe('Lattanzio Updated');
    expect(user.getPasswordHash()).toBe('new-hash');
    expect(user.getRole()).toBe(UserRole.ADMIN);
  });
});
