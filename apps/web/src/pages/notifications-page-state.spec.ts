import type { Notification } from '../api/types';
import { filterNotifications, toggleAlertType } from './notifications-page-state';

function notification(
  overrides: Partial<Notification> = {},
): Notification {
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

describe('notifications page state', () => {
  it('filters loaded notifications by multiple alert types, station, and unread state', () => {
    const notifications = [
      notification({ id: 'storm-unread', alertType: 'STORM' }),
      notification({
        id: 'frost-read',
        alertType: 'FROST',
        readAt: '2026-05-01T11:00:00.000Z',
      }),
      notification({
        id: 'heat-other-station',
        alertType: 'EXTREME_HEAT',
        stationId: 'station-2',
      }),
      notification({ id: 'humidity-unread', alertType: 'CRITICAL_HUMIDITY' }),
    ];

    const filtered = filterNotifications(notifications, {
      alertTypes: ['STORM', 'FROST'],
      stationId: 'station-1',
      unreadOnly: true,
    });

    expect(filtered.map((item) => item.id)).toEqual(['storm-unread']);
  });

  it('leaves the collection unchanged when no filters are selected', () => {
    const notifications = [
      notification({ id: 'notification-1' }),
      notification({ id: 'notification-2', stationId: 'station-2' }),
    ];

    expect(
      filterNotifications(notifications, {
        alertTypes: [],
        stationId: '',
        unreadOnly: false,
      }),
    ).toEqual(notifications);
  });

  it('toggles alert types while preserving the rest of the selection', () => {
    expect(toggleAlertType(['STORM'], 'FROST')).toEqual(['STORM', 'FROST']);
    expect(toggleAlertType(['STORM', 'FROST'], 'STORM')).toEqual(['FROST']);
  });
});
