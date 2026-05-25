import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ALERT_TYPE_LABELS,
  SUBSCRIBABLE_ALERT_TYPES,
  type AlertType,
  type AppNotification,
} from '../api/types';
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../api/weatherflow';
import { useApiErrorMessage } from '../auth/AuthContext';
import { ErrorBanner } from '../components/ErrorBanner';
import { useNotifications } from '../notifications/NotificationsContext';

export function NotificationsPage() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [alertType, setAlertType] = useState<AlertType | ''>('');
  const [stationFilter, setStationFilter] = useState('');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { refresh } = useNotifications();

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchNotifications({ limit: 100 });
      setNotifications(result.items);
    } catch (err) {
      setError(useApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  const filteredNotifications = useMemo(
    () =>
      notifications.filter((notification) => {
        const matchesAlertType =
          alertType === '' || notification.alertType === alertType;
        const matchesStation =
          stationFilter.trim() === '' ||
          notification.stationName
            .toLowerCase()
            .includes(stationFilter.trim().toLowerCase()) ||
          notification.stationId
            .toLowerCase()
            .includes(stationFilter.trim().toLowerCase());
        const matchesReadState = !unreadOnly || !notification.readAt;

        return matchesAlertType && matchesStation && matchesReadState;
      }),
    [alertType, notifications, stationFilter, unreadOnly],
  );

  async function handleMarkRead(notificationId: string) {
    await markNotificationRead(notificationId);
    setNotifications((current) =>
      current.map((notification) =>
        notification.id === notificationId
          ? { ...notification, readAt: new Date().toISOString() }
          : notification,
      ),
    );
    await refresh();
  }

  async function handleMarkAllRead() {
    await markAllNotificationsRead();
    setNotifications((current) =>
      current.map((notification) => ({
        ...notification,
        readAt: notification.readAt ?? new Date().toISOString(),
      })),
    );
    await refresh();
  }

  return (
    <section>
      <div className="page-heading">
        <div>
          <h1>Notificaciones</h1>
          <p className="lead">Historial de alertas recibidas en la app.</p>
        </div>
        <button type="button" className="secondary" onClick={handleMarkAllRead}>
          Marcar todas leidas
        </button>
      </div>

      {error ? <ErrorBanner message={error} /> : null}

      <div className="panel form-inline">
        <label>
          Tipo
          <select
            value={alertType}
            onChange={(event) => setAlertType(event.target.value as AlertType)}
          >
            <option value="">Todos</option>
            {SUBSCRIBABLE_ALERT_TYPES.map((type) => (
              <option key={type} value={type}>
                {ALERT_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Estacion
          <input
            type="search"
            value={stationFilter}
            onChange={(event) => setStationFilter(event.target.value)}
          />
        </label>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={unreadOnly}
            onChange={(event) => setUnreadOnly(event.target.checked)}
          />
          Solo no leidas
        </label>
      </div>

      {loading ? (
        <p className="muted">Cargando notificaciones...</p>
      ) : filteredNotifications.length === 0 ? (
        <p className="muted">
          No hay notificaciones para los filtros actuales.
        </p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Alerta</th>
              <th>Estacion</th>
              <th>Medicion</th>
              <th>Fecha</th>
              <th>Estado</th>
              <th>Accion</th>
            </tr>
          </thead>
          <tbody>
            {filteredNotifications.map((notification) => (
              <tr
                key={notification.id}
                className={notification.readAt ? '' : 'row-alert'}
              >
                <td>{ALERT_TYPE_LABELS[notification.alertType]}</td>
                <td>
                  <Link to={`/stations/${notification.stationId}`}>
                    {notification.stationName}
                  </Link>
                </td>
                <td>
                  {notification.temperature} C / {notification.humidity}% /{' '}
                  {notification.pressure} hPa
                </td>
                <td>
                  {new Date(notification.createdAt).toLocaleString('es-AR')}
                </td>
                <td>{notification.readAt ? 'Leida' : 'No leida'}</td>
                <td>
                  {!notification.readAt ? (
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => void handleMarkRead(notification.id)}
                    >
                      Marcar leida
                    </button>
                  ) : (
                    <span className="muted">-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
