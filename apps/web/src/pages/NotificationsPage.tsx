import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ALERT_TYPE_LABELS,
  SUBSCRIBABLE_ALERT_TYPES,
  type AlertType,
  type SubscribedStationSummary,
} from '../api/types';
import { fetchSubscriptions } from '../api/weatherflow';
import { useApiErrorMessage, useAuth } from '../auth/AuthContext';
import { ErrorBanner } from '../components/ErrorBanner';
import { useNotifications } from '../notifications/NotificationsContext';
import {
  filterNotifications,
  toggleAlertType,
} from './notifications-page-state';

export function NotificationsPage() {
  const { user } = useAuth();
  const {
    notifications,
    nextCursor,
    markRead,
    markAllRead,
    refresh,
    loadMore,
  } = useNotifications();
  const [subscriptions, setSubscriptions] = useState<
    SubscribedStationSummary[]
  >([]);
  const [alertTypes, setAlertTypes] = useState<AlertType[]>([]);
  const [stationId, setStationId] = useState('');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasMountedFilters = useRef(false);

  const loadInitialPage = useCallback(async () => {
    if (!user) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [loadedSubscriptions] = await Promise.all([
        fetchSubscriptions(user.id),
        refresh(),
      ]);
      setSubscriptions(loadedSubscriptions);
    } catch (err) {
      setError(useApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [refresh, user]);

  const resetPagination = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await refresh();
    } catch (err) {
      setError(useApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [refresh]);

  useEffect(() => {
    void loadInitialPage();
  }, [loadInitialPage]);

  useEffect(() => {
    if (!hasMountedFilters.current) {
      hasMountedFilters.current = true;
      return;
    }

    void resetPagination();
  }, [alertTypes, resetPagination, stationId, unreadOnly]);

  const filteredNotifications = useMemo(
    () =>
      filterNotifications(notifications, {
        alertTypes,
        stationId,
        unreadOnly,
      }),
    [alertTypes, notifications, stationId, unreadOnly],
  );

  async function handleLoadMore() {
    setLoadingMore(true);
    setError(null);
    try {
      await loadMore();
    } catch (err) {
      setError(useApiErrorMessage(err));
    } finally {
      setLoadingMore(false);
    }
  }

  async function handleMarkRead(notificationId: string) {
    setSaving(true);
    setError(null);
    try {
      await markRead(notificationId);
    } catch (err) {
      setError(useApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleMarkAllRead() {
    setSaving(true);
    setError(null);
    try {
      await markAllRead();
    } catch (err) {
      setError(useApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section>
      <div className="page-heading">
        <div>
          <h1>Notificaciones</h1>
          <p className="lead">Historial de alertas recibidas en la app.</p>
        </div>
        <button
          type="button"
          className="secondary"
          onClick={() => void handleMarkAllRead()}
          disabled={saving || notifications.every((item) => item.readAt)}
        >
          Marcar todas como leidas
        </button>
      </div>

      <ErrorBanner message={error} />

      <div className="panel notification-filters">
        <fieldset>
          <legend>Tipo de alerta</legend>
          <div className="checkbox-group">
            {SUBSCRIBABLE_ALERT_TYPES.map((type) => (
              <label key={type} className="checkbox">
                <input
                  type="checkbox"
                  checked={alertTypes.includes(type)}
                  onChange={() =>
                    setAlertTypes((current) => toggleAlertType(current, type))
                  }
                />
                {ALERT_TYPE_LABELS[type]}
              </label>
            ))}
          </div>
        </fieldset>

        <label>
          Estacion
          <select
            value={stationId}
            onChange={(event) => setStationId(event.target.value)}
          >
            <option value="">Todas</option>
            {subscriptions.map((subscription) => (
              <option
                key={subscription.stationId}
                value={subscription.stationId}
              >
                {subscription.station?.name ?? subscription.stationId}
              </option>
            ))}
          </select>
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
        <p className="muted empty-state">Sin notificaciones todavia</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Estado</th>
              <th>Alerta</th>
              <th>Estacion</th>
              <th>Medicion</th>
              <th>Fecha</th>
              <th>Accion</th>
            </tr>
          </thead>
          <tbody>
            {filteredNotifications.map((notification) => (
              <tr
                key={notification.id}
                className={notification.readAt ? undefined : 'row-alert'}
              >
                <td>
                  <span
                    className={
                      notification.readAt ? 'unread-dot hidden' : 'unread-dot'
                    }
                    aria-label={notification.readAt ? 'Leida' : 'No leida'}
                  />
                </td>
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
                  {new Date(notification.reportedAt).toLocaleString('es-AR')}
                </td>
                <td>
                  {!notification.readAt ? (
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => void handleMarkRead(notification.id)}
                      disabled={saving}
                    >
                      Marcar como leida
                    </button>
                  ) : (
                    <span className="muted">Leida</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {!loading && nextCursor ? (
        <div className="pagination-actions">
          <button
            type="button"
            className="secondary"
            onClick={() => void handleLoadMore()}
            disabled={loadingMore}
          >
            {loadingMore ? 'Cargando...' : 'Cargar mas'}
          </button>
        </div>
      ) : null}
    </section>
  );
}
