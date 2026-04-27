import { AlertType } from '../../../measurements/domain/value-objects/alert-type.enum';
import { User } from '../../domain/entities/user.entity';
import { Email } from '../../domain/value-objects/email.value-object';
import { UserRole } from '../../domain/value-objects/user-role.enum';
import { UserDocumentMapper } from './user-document.mapper';
import { UserSchema } from '../persistence/user.schema';

describe('User persistence mapping', () => {
  it('defines the user schema with the expected indexes and nested paths', () => {
    expect(UserSchema.path('email')).toBeDefined();
    expect(UserSchema.path('deliveryChannels.telegram.chatId')).toBeDefined();
    expect(UserSchema.path('telegramLinking.code')).toBeDefined();
    expect(UserSchema.path('notificationPreferences')).toBeDefined();

    expect(UserSchema.indexes()).toContainEqual([{ email: 1 }, { unique: true }]);
    expect(UserSchema.indexes()).toContainEqual([
      { 'notificationPreferences.stationId': 1 },
      {},
    ]);
    expect(UserSchema.indexes()).toContainEqual([{ 'telegramLinking.code': 1 }, {}]);
  });

  it('maps a user aggregate to a persistence document', () => {
    const user = User.create({
      id: 'user-1',
      name: 'Bruno',
      lastName: 'Lattanzio',
      email: Email.create('bruno@example.com'),
      passwordHash: 'hashed-password',
      notificationPreferences: [
        {
          stationId: 'station-1',
          alertTypes: [AlertType.STORM, AlertType.FROST],
        },
      ],
      deliveryChannels: {
        telegram: {
          chatId: '12345',
        },
      },
      telegramLinking: {
        code: 'WF-AB12CD34',
        expiresAt: new Date('2026-04-25T12:10:00.000Z'),
      },
      role: UserRole.ADMIN,
      createdAt: new Date('2026-04-25T12:00:00.000Z'),
    });

    expect(UserDocumentMapper.toPersistence(user)).toEqual({
      _id: 'user-1',
      name: 'Bruno',
      lastName: 'Lattanzio',
      email: 'bruno@example.com',
      passwordHash: 'hashed-password',
      notificationPreferences: [
        {
          stationId: 'station-1',
          alertTypes: [AlertType.STORM, AlertType.FROST],
        },
      ],
      deliveryChannels: {
        telegram: {
          chatId: '12345',
        },
      },
      telegramLinking: {
        code: 'WF-AB12CD34',
        expiresAt: new Date('2026-04-25T12:10:00.000Z'),
      },
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
      notificationPreferences: [
        {
          stationId: 'station-2',
          alertTypes: [AlertType.EXTREME_HEAT],
        },
      ],
      deliveryChannels: {
        telegram: {
          chatId: null,
        },
      },
      telegramLinking: {
        code: 'WF-AB12CD34',
        expiresAt: new Date('2026-04-25T13:10:00.000Z'),
      },
      role: UserRole.USER,
      createdAt: new Date('2026-04-25T13:00:00.000Z'),
    });

    expect(user.getId()).toBe('user-1');
    expect(user.getEmail().getValue()).toBe('ana@example.com');
    expect(user.getNotificationPreferences()).toEqual([
      {
        stationId: 'station-2',
        alertTypes: [AlertType.EXTREME_HEAT],
      },
    ]);
    expect(user.getDeliveryChannels()).toEqual({
      telegram: {
        chatId: null,
      },
    });
    expect(user.getTelegramLinking()).toEqual({
      code: 'WF-AB12CD34',
      expiresAt: new Date('2026-04-25T13:10:00.000Z'),
    });
    expect(user.getCreatedAt().toISOString()).toBe('2026-04-25T13:00:00.000Z');
  });
});
