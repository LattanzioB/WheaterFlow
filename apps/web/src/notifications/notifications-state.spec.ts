import type { Notification } from '../api/types';
import {
  initialNotificationsState,
  notificationsReducer,
} from './notifications-state';

function notification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: 'notification-1',
    userId: 'user-1',
    stationId: 'station-1',
    stationName: 'Central',
    alertType: 'STORM',
    temperature: 24,
    humidity: 91,
    pressure: 980,
    reportedAt: '2026-05-01T10:00:00.000Z',
    createdAt: '2026-05-01T10:01:00.000Z',
    readAt: null,
    messageId: 'message-1',
    ...overrides,
  };
}

describe('notificationsReducer', () => {
  it('hydrates items and unread count from the REST page', () => {
    const state = notificationsReducer(initialNotificationsState, {
      type: 'hydrate',
      page: {
        items: [
          notification({ id: 'notification-1' }),
          notification({
            id: 'notification-2',
            readAt: '2026-05-01T10:05:00.000Z',
          }),
        ],
        nextCursor: 'cursor-1',
        unreadCount: 7,
      },
    });

    expect(state.notifications).toHaveLength(2);
    expect(state.unreadCount).toBe(7);
    expect(state.nextCursor).toBe('cursor-1');
  });

  it('appends the next REST page without duplicating already loaded notifications', () => {
    const hydrated = notificationsReducer(initialNotificationsState, {
      type: 'hydrate',
      page: {
        items: [
          notification({ id: 'notification-1' }),
          notification({ id: 'notification-2' }),
        ],
        nextCursor: 'cursor-1',
        unreadCount: 4,
      },
    });
    const state = notificationsReducer(hydrated, {
      type: 'appendPage',
      page: {
        items: [
          notification({ id: 'notification-2' }),
          notification({ id: 'notification-3' }),
        ],
        nextCursor: 'cursor-2',
        unreadCount: 5,
      },
    });

    expect(state.notifications.map((item) => item.id)).toEqual([
      'notification-1',
      'notification-2',
      'notification-3',
    ]);
    expect(state.unreadCount).toBe(5);
    expect(state.nextCursor).toBe('cursor-2');
  });

  it('prepends live notifications, increments unread count, and records arrival sequence', () => {
    const state = notificationsReducer(initialNotificationsState, {
      type: 'liveReceived',
      notification: notification({ id: 'notification-live' }),
    });

    expect(state.notifications[0]?.id).toBe('notification-live');
    expect(state.unreadCount).toBe(1);
    expect(state.latestLiveArrival?.sequence).toBe(1);
    expect(state.latestLiveArrival?.notification.id).toBe('notification-live');
  });

  it('does not increment unread count for duplicate live notifications', () => {
    const hydrated = notificationsReducer(initialNotificationsState, {
      type: 'hydrate',
      page: {
        items: [notification({ id: 'notification-1' })],
        nextCursor: null,
        unreadCount: 4,
      },
    });
    const state = notificationsReducer(hydrated, {
      type: 'liveReceived',
      notification: notification({ id: 'notification-1' }),
    });

    expect(state.notifications).toHaveLength(1);
    expect(state.unreadCount).toBe(4);
  });

  it('marks unread notifications as read and decrements the unread count once', () => {
    const hydrated = notificationsReducer(initialNotificationsState, {
      type: 'hydrate',
      page: {
        items: [notification({ id: 'notification-1' })],
        nextCursor: null,
        unreadCount: 3,
      },
    });
    const read = notificationsReducer(hydrated, {
      type: 'markRead',
      id: 'notification-1',
      readAt: '2026-05-01T11:00:00.000Z',
    });
    const readAgain = notificationsReducer(read, {
      type: 'markRead',
      id: 'notification-1',
      readAt: '2026-05-01T11:05:00.000Z',
    });

    expect(read.notifications[0]?.readAt).toBe('2026-05-01T11:00:00.000Z');
    expect(read.unreadCount).toBe(2);
    expect(readAgain.unreadCount).toBe(2);
  });

  it('marks all visible notifications as read and resets unread count', () => {
    const hydrated = notificationsReducer(initialNotificationsState, {
      type: 'hydrate',
      page: {
        items: [
          notification({ id: 'notification-1' }),
          notification({
            id: 'notification-2',
            readAt: '2026-05-01T10:05:00.000Z',
          }),
        ],
        nextCursor: null,
        unreadCount: 9,
      },
    });
    const state = notificationsReducer(hydrated, {
      type: 'markAllRead',
      readAt: '2026-05-01T11:00:00.000Z',
    });

    expect(state.unreadCount).toBe(0);
    expect(state.notifications.map((item) => item.readAt)).toEqual([
      '2026-05-01T11:00:00.000Z',
      '2026-05-01T10:05:00.000Z',
    ]);
  });
});
