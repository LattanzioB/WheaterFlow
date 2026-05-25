import { useEffect } from 'react';
import { ALERT_TYPE_LABELS, type Notification } from '../api/types';

interface ToastProps {
  notification: Notification;
  onClick: () => void;
  onDismiss: () => void;
}

export function Toast({ notification, onClick, onDismiss }: ToastProps) {
  useEffect(() => {
    const timer = window.setTimeout(onDismiss, 6000);
    return () => window.clearTimeout(timer);
  }, [notification.id, onDismiss]);

  return (
    <div className="notification-toast" role="status">
      <button type="button" className="toast-body" onClick={onClick}>
        <strong>{ALERT_TYPE_LABELS[notification.alertType]}</strong>
        <span>{notification.stationName}</span>
      </button>
      <button
        type="button"
        className="toast-close"
        aria-label="Cerrar notificacion"
        onClick={onDismiss}
      >
        x
      </button>
    </div>
  );
}
