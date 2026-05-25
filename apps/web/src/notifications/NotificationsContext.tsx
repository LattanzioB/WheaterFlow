import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { getNotificationsBaseUrl, getStoredToken } from '../api/client';
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../api/weatherflow';
import type { AppNotification } from '../api/types';
import { useAuth } from '../auth/AuthContext';

interface NotificationsContextValue {
  notifications: AppNotification[];
  unreadCount: number;
  latestLiveNotification: AppNotification | null;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  refresh: () => Promise<void>;
  clearLatestLiveNotification: () => void;
}

const BACKOFF_MS = [1000, 2000, 5000, 15000];

const NotificationsContext = createContext<NotificationsContextValue | null>(
  null,
);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [latestLiveNotification, setLatestLiveNotification] =
    useState<AppNotification | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const retryTimerRef = useRef<number | null>(null);
  const retryAttemptRef = useRef(0);

  const mergeNotification = useCallback((notification: AppNotification) => {
    setNotifications((current) => {
      const withoutDuplicate = current.filter(
        (item) => item.id !== notification.id,
      );
      return [notification, ...withoutDuplicate].slice(0, 50);
    });
  }, []);

  const refresh = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      return;
    }

    const result = await fetchNotifications({ unreadOnly: true, limit: 20 });
    setNotifications(result.notifications);
  }, [user]);

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
    if (!user || !token || eventSourceRef.current) {
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
      const notification = JSON.parse(event.data) as AppNotification;
      mergeNotification(notification);
      setLatestLiveNotification(notification);
    });

    eventSource.onerror = () => {
      eventSource.close();
      eventSourceRef.current = null;
      const delay =
        BACKOFF_MS[Math.min(retryAttemptRef.current, BACKOFF_MS.length - 1)];
      retryAttemptRef.current += 1;
      retryTimerRef.current = window.setTimeout(openStream, delay);
    };
  }, [mergeNotification, user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    closeStream();
    retryAttemptRef.current = 0;

    if (user) {
      openStream();
    }

    return closeStream;
  }, [closeStream, openStream, user]);

  const markRead = useCallback(async (id: string) => {
    const updated = await markNotificationRead(id);
    setNotifications((current) =>
      current.map((notification) =>
        notification.id === id ? updated : notification,
      ),
    );
  }, []);

  const markAllRead = useCallback(async () => {
    await markAllNotificationsRead();
    setNotifications((current) =>
      current.map((notification) => ({
        ...notification,
        readAt: notification.readAt ?? new Date().toISOString(),
      })),
    );
  }, []);

  const value = useMemo(
    () => ({
      notifications,
      unreadCount: notifications.filter((notification) => !notification.readAt)
        .length,
      latestLiveNotification,
      markRead,
      markAllRead,
      refresh,
      clearLatestLiveNotification: () => setLatestLiveNotification(null),
    }),
    [latestLiveNotification, markAllRead, markRead, notifications, refresh],
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
