import { AlertType } from '@contracts/measurements/alert-type';
import { Notification } from '../../domain/entities/notification.entity';
import { NotificationDocumentMapper } from './notification-document.mapper';

describe('NotificationDocumentMapper', () => {
  it('round-trips a notification between domain and persistence shapes', () => {
    const notification = Notification.create({
      id: 'notification-1',
      userId: 'user-1',
      stationId: 'station-1',
      stationName: 'Central',
      alertType: AlertType.STORM,
      temperature: 24,
      humidity: 90,
      pressure: 968,
      reportedAt: new Date('2026-05-01T10:00:00.000Z'),
      createdAt: new Date('2026-05-01T10:01:00.000Z'),
      readAt: new Date('2026-05-01T10:02:00.000Z'),
      messageId: 'message-1',
    });

    const persistence = NotificationDocumentMapper.toPersistence(notification);
    const mapped = NotificationDocumentMapper.toDomain(persistence);

    expect(persistence).toEqual({
      _id: 'notification-1',
      userId: 'user-1',
      stationId: 'station-1',
      stationName: 'Central',
      alertType: AlertType.STORM,
      temperature: 24,
      humidity: 90,
      pressure: 968,
      reportedAt: new Date('2026-05-01T10:00:00.000Z'),
      createdAt: new Date('2026-05-01T10:01:00.000Z'),
      readAt: new Date('2026-05-01T10:02:00.000Z'),
      messageId: 'message-1',
    });
    expect(NotificationDocumentMapper.toPersistence(mapped)).toEqual(
      persistence,
    );
  });
});
