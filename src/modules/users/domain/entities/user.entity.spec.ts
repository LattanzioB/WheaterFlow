import { User } from './user.entity';
import { Email } from '../value-objects/email.value-object';
import { UserRole } from '../value-objects/user-role.enum';

describe('User', () => {
  const buildUser = () =>
    User.create({
      name: ' Bruno ',
      lastName: ' Lattanzio ',
      email: Email.create('bruno@example.com'),
      passwordHash: ' hashed-password ',
      telegramChatId: ' 12345 ',
    });

  it('creates a user with normalized values and a default role', () => {
    const user = buildUser();

    expect(user.getId()).toBeTruthy();
    expect(user.getName()).toBe('Bruno');
    expect(user.getLastName()).toBe('Lattanzio');
    expect(user.getPasswordHash()).toBe('hashed-password');
    expect(user.getTelegramChatId()).toBe('12345');
    expect(user.getRole()).toBe(UserRole.USER);
    expect(user.getSubscriptions()).toEqual([]);
  });

  it('supports explicit roles and initial subscriptions', () => {
    const user = User.create({
      id: 'user-1',
      name: 'Ana',
      lastName: 'Owner',
      email: Email.create('ana@example.com'),
      passwordHash: 'hash',
      role: UserRole.ADMIN,
      subscriptions: ['station-1', 'station-2'],
      createdAt: new Date('2026-04-25T10:00:00.000Z'),
    });

    expect(user.getRole()).toBe(UserRole.ADMIN);
    expect(user.getSubscriptions()).toEqual(['station-1', 'station-2']);
    expect(user.getCreatedAt().toISOString()).toBe('2026-04-25T10:00:00.000Z');
  });

  it('adds and removes station subscriptions without exposing internal state', () => {
    const user = buildUser();

    user.addSubscription('station-1');

    const subscriptions = user.getSubscriptions();
    subscriptions.push('station-2');

    expect(user.isSubscribedTo('station-1')).toBe(true);
    expect(user.isSubscribedTo('station-2')).toBe(false);

    user.removeSubscription('station-1');

    expect(user.isSubscribedTo('station-1')).toBe(false);
  });

  it('rejects duplicate subscriptions on create and on later updates', () => {
    expect(() =>
      User.create({
        name: 'Ana',
        lastName: 'Owner',
        email: Email.create('ana@example.com'),
        passwordHash: 'hash',
        subscriptions: ['station-1', 'station-1'],
      }),
    ).toThrow('Subscriptions cannot contain duplicates');

    const user = buildUser();
    user.addSubscription('station-1');

    expect(() => user.addSubscription('station-1')).toThrow(
      'User is already subscribed to the station',
    );
  });

  it('rejects blank required fields', () => {
    expect(() =>
      User.create({
        name: ' ',
        lastName: 'Owner',
        email: Email.create('ana@example.com'),
        passwordHash: 'hash',
      }),
    ).toThrow('Name cannot be empty');

    expect(() =>
      User.create({
        name: 'Ana',
        lastName: ' ',
        email: Email.create('ana@example.com'),
        passwordHash: 'hash',
      }),
    ).toThrow('Last name cannot be empty');

    expect(() =>
      User.create({
        name: 'Ana',
        lastName: 'Owner',
        email: Email.create('ana@example.com'),
        passwordHash: ' ',
      }),
    ).toThrow('Password hash cannot be empty');
  });

  it('allows updating credentials, names, roles, and telegram chat id', () => {
    const user = buildUser();

    user.changeName('Ana', 'Admin');
    user.changePasswordHash('new-hash');
    user.assignRole(UserRole.ADMIN);
    user.setTelegramChatId(null);

    expect(user.getName()).toBe('Ana');
    expect(user.getLastName()).toBe('Admin');
    expect(user.getPasswordHash()).toBe('new-hash');
    expect(user.getRole()).toBe(UserRole.ADMIN);
    expect(user.getTelegramChatId()).toBeNull();
  });

  it('trims telegram chat ids when they are reassigned', () => {
    const user = buildUser();

    user.setTelegramChatId(' 98765 ');

    expect(user.getTelegramChatId()).toBe('98765');
  });
});
