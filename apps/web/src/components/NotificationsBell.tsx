import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ALERT_TYPE_LABELS, type Notification } from '../api/types';
import { useNotifications } from '../notifications/NotificationsContext';

export function NotificationsBell() {
  const { notifications, unreadCount, markRead, markAllRead } =
    useNotifications();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();
  const latest = notifications.slice(0, 10);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleClick = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  async function handleNotificationClick(notification: Notification) {
    if (!notification.readAt) {
      await markRead(notification.id);
    }
    setOpen(false);
    navigate(`/stations/${notification.stationId}`);
  }

  async function handleMarkAllRead() {
    await markAllRead();
    setOpen(false);
  }

  return (
    <div className="notifications-bell" ref={containerRef}>
      <button
        type="button"
        className="icon-button"
        aria-label="Notificaciones"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <svg
          aria-hidden="true"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 ? (
          <span className="badge">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        ) : null}
      </button>
      {open ? (
        <div className="notifications-menu">
          <div className="notifications-menu-header">
            <strong>Notificaciones</strong>
            <Link to="/notifications" onClick={() => setOpen(false)}>
              Ver todas
            </Link>
          </div>
          {latest.length === 0 ? (
            <p className="notifications-empty muted">Sin alertas nuevas.</p>
          ) : (
            <ul className="notifications-list compact">
              {latest.map((notification) => (
                <li
                  key={notification.id}
                  className={notification.readAt ? '' : 'unread'}
                >
                  <button
                    type="button"
                    className="notification-row"
                    onClick={() => void handleNotificationClick(notification)}
                  >
                    <span
                      className={
                        notification.readAt ? 'unread-dot hidden' : 'unread-dot'
                      }
                      aria-hidden="true"
                    />
                    <span>
                      <strong>
                        {ALERT_TYPE_LABELS[notification.alertType]}
                      </strong>
                      <span>{notification.stationName}</span>
                      <small>
                        {new Date(notification.createdAt).toLocaleString(
                          'es-AR',
                        )}
                      </small>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="notifications-menu-footer">
            <button
              type="button"
              className="link-button"
              onClick={() => void handleMarkAllRead()}
              disabled={unreadCount === 0}
            >
              Marcar todas como leidas
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
