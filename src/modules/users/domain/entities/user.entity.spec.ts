import { AlertType } from '../../../measurements/domain/value-objects/alert-type.enum';
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
      deliveryChannels: {
        telegram: {
          chatId: ' 12345 ',
        },
      },
    });

  it('creates a user with normalized values and a default role', () => {
    const user = buildUser();

    expect(user.getId()).toBeTruthy();
    expect(user.getName()).toBe('Bruno');
    expect(user.getLastName()).toBe('Lattanzio');
    expect(user.getPasswordHash()).toBe('hashed-password');
    expect(user.getRole()).toBe(UserRole.USER);
    expect(user.getSubscriptions()).toEqual([]);
    expect(user.getDeliveryChannels()).toEqual({
      telegram: {
        chatId: '12345',
      },
    });
    expect(user.getTelegramLinking()).toEqual({
      code: null,
      expiresAt: null,
    });
  });

  it('supports explicit roles and notification preferences', () => {
    const user = User.create({
      id: 'user-1',
      name: 'Ana',
      lastName: 'Owner',
      email: Email.create('ana@example.com'),
      passwordHash: 'hash',
      role: UserRole.ADMIN,
      notificationPreferences: [
        {
          stationId: 'station-1',
          alertTypes: [AlertType.STORM, AlertType.FROST],
        },
        {
          stationId: 'station-2',
          alertTypes: [AlertType.EXTREME_HEAT],
        },
      ],
      deliveryChannels: {
        telegram: {
          chatId: 'channel-1',
        },
      },
      createdAt: new Date('2026-04-25T10:00:00.000Z'),
    });

    expect(user.getRole()).toBe(UserRole.ADMIN);
    expect(user.getSubscriptions()).toEqual(['station-1', 'station-2']);
    expect(user.getNotificationPreferences()).toEqual([
      {
        stationId: 'station-1',
        alertTypes: [AlertType.STORM, AlertType.FROST],
      },
      {
        stationId: 'station-2',
        alertTypes: [AlertType.EXTREME_HEAT],
      },
    ]);
    expect(user.getDeliveryChannels()).toEqual({
      telegram: {
        chatId: 'channel-1',
      },
    });
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

  it('supports station preferences with selected alert types', () => {
    const user = buildUser();

    user.subscribeToAlerts('station-1', [AlertType.STORM, AlertType.FROST]);

    expect(user.isSubscribedTo('station-1')).toBe(true);
    expect(user.isSubscribedToAlert('station-1', AlertType.STORM)).toBe(true);
    expect(user.isSubscribedToAlert('station-1', AlertType.FROST)).toBe(true);
    expect(user.isSubscribedToAlert('station-1', AlertType.EXTREME_HEAT)).toBe(
      false,
    );

    user.updateAlertTypesForStation('station-1', [AlertType.EXTREME_HEAT]);

    expect(user.getSubscribedAlertTypesForStation('station-1')).toEqual([
      AlertType.EXTREME_HEAT,
    ]);
    expect(user.isSubscribedToAlert('station-1', AlertType.STORM)).toBe(false);
  });

  it('rejects duplicate subscriptions on create and on later updates', () => {
    expect(() =>
      User.create({
        name: 'Ana',
        lastName: 'Owner',
        email: Email.create('ana@example.com'),
        passwordHash: 'hash',
        notificationPreferences: [
          {
            stationId: 'station-1',
            alertTypes: [AlertType.STORM],
          },
          {
            stationId: 'station-1',
            alertTypes: [AlertType.FROST],
          },
        ],
      }),
    ).toThrow('Notification preferences cannot contain duplicate stations');

    const user = buildUser();
    user.addSubscription('station-1');

    expect(() => user.addSubscription('station-1')).toThrow(
      'User is already subscribed to the station',
    );
  });

  it('rejects invalid alert type selections', () => {
    expect(() =>
      User.create({
        name: 'Ana',
        lastName: 'Owner',
        email: Email.create('ana@example.com'),
        passwordHash: 'hash',
        notificationPreferences: [
          {
            stationId: 'station-1',
            alertTypes: [],
          },
        ],
      }),
    ).toThrow('Alert types cannot be empty');

    expect(() =>
      User.create({
        name: 'Ana',
        lastName: 'Owner',
        email: Email.create('ana@example.com'),
        passwordHash: 'hash',
        notificationPreferences: [
          {
            stationId: 'station-1',
            alertTypes: [AlertType.STORM, AlertType.STORM],
          },
        ],
      }),
    ).toThrow('Alert types cannot contain duplicates');

    const user = buildUser();

    expect(() => user.subscribeToAlerts('station-1', [AlertType.NONE])).toThrow(
      'Alert type is not supported for subscriptions',
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

  it('allows updating credentials, names, roles, and telegram delivery settings', () => {
    const user = buildUser();

    user.changeName('Ana', 'Admin');
    user.changePasswordHash('new-hash');
    user.assignRole(UserRole.ADMIN);
    user.configureTelegramDelivery(null);

    expect(user.getName()).toBe('Ana');
    expect(user.getLastName()).toBe('Admin');
    expect(user.getPasswordHash()).toBe('new-hash');
    expect(user.getRole()).toBe(UserRole.ADMIN);
    expect(user.getDeliveryChannels()).toEqual({
      telegram: {
        chatId: null,
      },
    });
  });

  it('trims telegram chat ids when they are reassigned', () => {
    const user = buildUser();

    user.configureTelegramDelivery(' 98765 ');

    expect(user.getDeliveryChannels()).toEqual({
      telegram: {
        chatId: '98765',
      },
    });
  });

  it('creates and clears Telegram link codes as part of the linking lifecycle', () => {
    const user = buildUser();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    user.startTelegramLinking(' WF-AB12CD34 ', expiresAt);

    expect(user.hasActiveTelegramLinkCode('WF-AB12CD34')).toBe(true);
    expect(user.getTelegramLinking()).toEqual({
      code: 'WF-AB12CD34',
      expiresAt,
    });

    user.completeTelegramLinking('98765');

    expect(user.getDeliveryChannels()).toEqual({
      telegram: {
        chatId: '98765',
      },
    });
    expect(user.getTelegramLinking()).toEqual({
      code: null,
      expiresAt: null,
    });
  });

  it('recognizes expired Telegram link codes as inactive', () => {
    const user = User.create({
      name: 'Ana',
      lastName: 'Owner',
      email: Email.create('ana@example.com'),
      passwordHash: 'hash',
      telegramLinking: {
        code: 'WF-EXPIRED',
        expiresAt: new Date('2026-04-25T10:00:00.000Z'),
      },
    });

    expect(
      user.hasActiveTelegramLinkCode(
        'WF-EXPIRED',
        new Date('2026-04-25T10:05:00.000Z'),
      ),
    ).toBe(false);
  });

  it('derives full alert coverage from legacy subscriptions for backward compatibility', () => {
    const user = User.create({
      name: 'Legacy',
      lastName: 'User',
      email: Email.create('legacy@example.com'),
      passwordHash: 'hash',
      subscriptions: ['station-1'],
    });

    expect(user.getNotificationPreferences()).toEqual([
      {
        stationId: 'station-1',
        alertTypes: [
          AlertType.EXTREME_HEAT,
          AlertType.FROST,
          AlertType.STORM,
          AlertType.CRITICAL_HUMIDITY,
        ],
      },
    ]);
  });
});
