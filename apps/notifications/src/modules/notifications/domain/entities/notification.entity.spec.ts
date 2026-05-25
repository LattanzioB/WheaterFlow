import { AlertType } from '@contracts/measurements/alert-type';
import { Notification } from './notification.entity';

describe('Notification', () => {
  const baseProps = {
    id: 'notification-1',
    userId: 'user-1',
    stationId: 'station-1',
    stationName: 'Central',
    alertType: AlertType.STORM,
    temperature: 22,
    humidity: 91,
    pressure: 969,
    reportedAt: new Date('2026-05-01T10:00:00.000Z'),
    createdAt: new Date('2026-05-01T10:01:00.000Z'),
    messageId: 'message-1',
  };

  it('creates an unread notification snapshot', () => {
    const notification = Notification.create(baseProps);

    expect(notification.getId()).toBe('notification-1');
    expect(notification.getUserId()).toBe('user-1');
    expect(notification.getStationName()).toBe('Central');
    expect(notification.getAlertType()).toBe(AlertType.STORM);
    expect(notification.getReadAt()).toBeNull();
    expect(notification.getMessageId()).toBe('message-1');
  });

  it('marks the notification as read', () => {
    const notification = Notification.create(baseProps);
    const readAt = new Date('2026-05-01T11:00:00.000Z');

    notification.markRead(readAt);

    expect(notification.getReadAt()).toEqual(readAt);
  });

  it('rejects unsupported alert types', () => {
    expect(() =>
      Notification.create({
        ...baseProps,
        alertType: AlertType.NONE,
      }),
    ).toThrow('Alert type is not supported for notifications');
  });
});
