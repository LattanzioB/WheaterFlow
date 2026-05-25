import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ALERT_TYPE_LABELS } from '../api/types';
import { useNotifications } from '../notifications/NotificationsContext';

export function NotificationToast() {
  const { latestLiveNotification, clearLatestLiveNotification } =
    useNotifications();

  useEffect(() => {
    if (!latestLiveNotification) {
      return;
    }

    const timer = window.setTimeout(clearLatestLiveNotification, 6000);
    return () => window.clearTimeout(timer);
  }, [clearLatestLiveNotification, latestLiveNotification]);

  if (!latestLiveNotification) {
    return null;
  }

  return (
    <div className="notification-toast" role="status">
      <Link
        to={`/stations/${latestLiveNotification.stationId}`}
        onClick={clearLatestLiveNotification}
      >
        <strong>{ALERT_TYPE_LABELS[latestLiveNotification.alertType]}</strong>
        <span>{latestLiveNotification.stationName}</span>
      </Link>
      <button
        type="button"
        className="toast-close"
        aria-label="Cerrar notificacion"
        onClick={clearLatestLiveNotification}
      >
        x
      </button>
    </div>
  );
}
