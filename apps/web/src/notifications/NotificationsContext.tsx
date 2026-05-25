import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from 'react';
import { getNotificationsBaseUrl, getStoredToken } from '../api/client';
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../api/weatherflow';
import type { Notification } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import {
  initialNotificationsState,
  notificationsReducer,
  type LiveArrival,
} from './notifications-state';

interface NotificationsContextValue {
  notifications: Notification[];
  unreadCount: number;
  latestLiveArrival: LiveArrival | null;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  refresh: () => Promise<void>;
  clearLatestLiveArrival: () => void;
}

const BACKOFF_MS = [1000, 2000, 5000, 15000];

const NotificationsContext = createContext<NotificationsContextValue | null>(
  null,
);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [state, dispatch] = useReducer(
    notificationsReducer,
    initialNotificationsState,
  );
  const eventSourceRef = useRef<EventSource | null>(null);
  const retryTimerRef = useRef<number | null>(null);
  const retryAttemptRef = useRef(0);
  const userRef = useRef(user);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const refresh = useCallback(async () => {
    if (!userRef.current) {
      dispatch({ type: 'reset' });
      return;
    }

    const page = await fetchNotifications({ limit: 20 });
    dispatch({ type: 'hydrate', page });
  }, []);

  const closeStream = useCallback(() => {
    eventSourceRef.current?.close();
    eventSourceRef.current = null;
    if (retryTimerRef.current !== null) {
      window.clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  }, []);

  const openStream = useCallback(() => {
    const token = getStoredToken();
    if (!userRef.current || !token || eventSourceRef.current) {
      return;
    }

    const url = new URL('/notifications/stream', getNotificationsBaseUrl());
    url.searchParams.set('token', token);
    const eventSource = new EventSource(url.toString());
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      retryAttemptRef.current = 0;
    };

    eventSource.addEventListener('notification', (event) => {
      const notification = JSON.parse(event.data) as Notification;
      dispatch({ type: 'liveReceived', notification });
    });

    eventSource.onerror = () => {
      eventSource.close();
      eventSourceRef.current = null;

      const delay =
        BACKOFF_MS[Math.min(retryAttemptRef.current, BACKOFF_MS.length - 1)];
      retryAttemptRef.current += 1;
      retryTimerRef.current = window.setTimeout(() => {
        retryTimerRef.current = null;
        void refresh()
          .catch(() => undefined)
          .finally(openStream);
      }, delay);
    };
  }, [refresh]);

  useEffect(() => {
    closeStream();
    retryAttemptRef.current = 0;

    if (!user) {
      dispatch({ type: 'reset' });
      return closeStream;
    }

    void refresh();
    openStream();

    return closeStream;
  }, [closeStream, openStream, refresh, user]);

  const markRead = useCallback(async (id: string) => {
    await markNotificationRead(id);
    dispatch({
      type: 'markRead',
      id,
      readAt: new Date().toISOString(),
    });
  }, []);

  const markAllRead = useCallback(async () => {
    await markAllNotificationsRead();
    await refresh();
  }, [refresh]);

  const clearLatestLiveArrival = useCallback(() => {
    dispatch({ type: 'clearLatestLiveArrival' });
  }, []);

  const value = useMemo(
    () => ({
      notifications: state.notifications,
      unreadCount: state.unreadCount,
      latestLiveArrival: state.latestLiveArrival,
      markRead,
      markAllRead,
      refresh,
      clearLatestLiveArrival,
    }),
    [
      clearLatestLiveArrival,
      markAllRead,
      markRead,
      refresh,
      state.latestLiveArrival,
      state.notifications,
      state.unreadCount,
    ],
  );

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications(): NotificationsContextValue {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    throw new Error(
      'useNotifications debe usarse dentro de NotificationsProvider',
    );
  }
  return ctx;
}
