import type { Notification, NotificationsPage } from '../api/types';

export interface LiveArrival {
  sequence: number;
  notification: Notification;
}

export interface NotificationsState {
  notifications: Notification[];
  unreadCount: number;
  nextCursor: string | null;
  latestLiveArrival: LiveArrival | null;
  nextLiveSequence: number;
}

export type NotificationsAction =
  | { type: 'hydrate'; page: NotificationsPage }
  | { type: 'appendPage'; page: NotificationsPage }
  | { type: 'liveReceived'; notification: Notification }
  | { type: 'markRead'; id: string; readAt: string }
  | { type: 'markAllRead'; readAt: string }
  | { type: 'clearLatestLiveArrival' }
  | { type: 'reset' };

export const initialNotificationsState: NotificationsState = {
  notifications: [],
  unreadCount: 0,
  nextCursor: null,
  latestLiveArrival: null,
  nextLiveSequence: 1,
};

export function notificationsReducer(
  state: NotificationsState,
  action: NotificationsAction,
): NotificationsState {
  switch (action.type) {
    case 'hydrate':
      return {
        ...state,
        notifications: action.page.items,
        unreadCount: action.page.unreadCount,
        nextCursor: action.page.nextCursor,
      };
    case 'appendPage': {
      const existingIds = new Set(
        state.notifications.map((notification) => notification.id),
      );

      return {
        ...state,
        notifications: [
          ...state.notifications,
          ...action.page.items.filter(
            (notification) => !existingIds.has(notification.id),
          ),
        ],
        unreadCount: action.page.unreadCount,
        nextCursor: action.page.nextCursor,
      };
    }
    case 'liveReceived': {
      const existing = state.notifications.find(
        (notification) => notification.id === action.notification.id,
      );
      const notifications = [
        action.notification,
        ...state.notifications.filter(
          (notification) => notification.id !== action.notification.id,
        ),
      ].slice(0, 50);

      return {
        ...state,
        notifications,
        unreadCount:
          existing || action.notification.readAt
            ? state.unreadCount
            : state.unreadCount + 1,
        latestLiveArrival: {
          sequence: state.nextLiveSequence,
          notification: action.notification,
        },
        nextLiveSequence: state.nextLiveSequence + 1,
      };
    }
    case 'markRead': {
      let decremented = false;
      const notifications = state.notifications.map((notification) => {
        if (notification.id !== action.id || notification.readAt) {
          return notification;
        }

        decremented = true;
        return { ...notification, readAt: action.readAt };
      });

      return {
        ...state,
        notifications,
        unreadCount: decremented
          ? Math.max(0, state.unreadCount - 1)
          : state.unreadCount,
      };
    }
    case 'markAllRead':
      return {
        ...state,
        notifications: state.notifications.map((notification) => ({
          ...notification,
          readAt: notification.readAt ?? action.readAt,
        })),
        unreadCount: 0,
      };
    case 'clearLatestLiveArrival':
      return { ...state, latestLiveArrival: null };
    case 'reset':
      return initialNotificationsState;
  }
}
