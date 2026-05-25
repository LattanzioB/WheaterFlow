import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ALERT_TYPE_LABELS } from '../api/types';
import { useNotifications } from '../notifications/NotificationsContext';

export function NotificationsBell() {
  const { notifications, unreadCount, markRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const latest = notifications.slice(0, 10);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className="notifications-bell" ref={containerRef}>
      <button
        type="button"
        className="icon-button"
        aria-label="Notificaciones"
        onClick={() => setOpen((current) => !current)}
      >
        <span aria-hidden="true">!</span>
        {unreadCount > 0 ? (
          <span className="badge">{Math.min(unreadCount, 99)}</span>
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
            <p className="muted">Sin alertas nuevas.</p>
          ) : (
            <ul className="notifications-list compact">
              {latest.map((notification) => (
                <li
                  key={notification.id}
                  className={notification.readAt ? '' : 'unread'}
                >
                  <Link
                    to={`/stations/${notification.stationId}`}
                    onClick={() => setOpen(false)}
                  >
                    <strong>{ALERT_TYPE_LABELS[notification.alertType]}</strong>
                    <span>{notification.stationName}</span>
                    <small>
                      {new Date(notification.createdAt).toLocaleString('es-AR')}
                    </small>
                  </Link>
                  {!notification.readAt ? (
                    <button
                      type="button"
                      className="link-button"
                      onClick={() => void markRead(notification.id)}
                    >
                      Marcar leida
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
