import { useEffect, useState } from 'react';
import { useApiErrorMessage } from '../auth/AuthContext';
import { ErrorBanner } from '../components/ErrorBanner';
import {
  fetchAllNotifications,
  fetchAvailableStations,
  fetchNotificationProfiles,
  fetchUsersDirectory,
  queryMeasurements,
} from '../api/weatherflow';
import {
  ALERT_TYPE_LABELS,
  type Measurement,
  type NotificationProfilesPage,
  type NotificationsCollectionPage,
  type UsersDirectoryPage,
  type WeatherStation,
} from '../api/types';
import {
  COLLECTION_KEYS,
  COLLECTION_LABELS,
  pageToOffset,
  paginate,
  totalPages,
  type CollectionKey,
} from './data-collections-page-state';

const PAGE_SIZE = 10;

function formatDate(value: string): string {
  return new Date(value).toLocaleString('es-AR');
}

export function DataCollectionsPage() {
  const [activeTab, setActiveTab] = useState<CollectionKey>('users');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [users, setUsers] = useState<UsersDirectoryPage | null>(null);
  const [stations, setStations] = useState<WeatherStation[] | null>(null);
  const [measurements, setMeasurements] = useState<Measurement[] | null>(null);
  const [profiles, setProfiles] = useState<NotificationProfilesPage | null>(
    null,
  );
  const [notifications, setNotifications] =
    useState<NotificationsCollectionPage | null>(null);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const offset = pageToOffset(page, PAGE_SIZE);
        if (activeTab === 'users') {
          setUsers(await fetchUsersDirectory({ limit: PAGE_SIZE, offset }));
        } else if (activeTab === 'stations') {
          setStations(await fetchAvailableStations());
        } else if (activeTab === 'measurements') {
          setMeasurements(await queryMeasurements({}));
        } else if (activeTab === 'profiles') {
          setProfiles(
            await fetchNotificationProfiles({ limit: PAGE_SIZE, offset }),
          );
        } else {
          setNotifications(
            await fetchAllNotifications({ limit: PAGE_SIZE, offset }),
          );
        }
      } catch (err) {
        setError(useApiErrorMessage(err));
      } finally {
        setLoading(false);
      }
    })();
  }, [activeTab, page]);

  const selectTab = (tab: CollectionKey) => {
    setActiveTab(tab);
    setPage(1);
  };

  const total =
    activeTab === 'users'
      ? (users?.total ?? 0)
      : activeTab === 'stations'
        ? (stations?.length ?? 0)
        : activeTab === 'measurements'
          ? (measurements?.length ?? 0)
          : activeTab === 'profiles'
            ? (profiles?.total ?? 0)
            : (notifications?.total ?? 0);
  const pages = totalPages(total, PAGE_SIZE);

  return (
    <section>
      <h1>Datos · Colecciones</h1>
      <p className="lead">
        Vista de solo lectura de las colecciones persistidas en MongoDB,
        consumidas vía REST con JWT.
      </p>
      <ErrorBanner message={error} />

      <div className="tabs">
        {COLLECTION_KEYS.map((key) => (
          <button
            key={key}
            type="button"
            className={activeTab === key ? undefined : 'secondary'}
            onClick={() => selectTab(key)}
          >
            {COLLECTION_LABELS[key]}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="muted">Cargando colección...</p>
      ) : total === 0 ? (
        <p className="muted empty-state">Sin registros en la colección</p>
      ) : (
        <>
          {activeTab === 'users' && users && (
            <table>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Apellido</th>
                  <th>Email</th>
                  <th>Rol</th>
                  <th>Creado</th>
                </tr>
              </thead>
              <tbody>
                {users.items.map((user) => (
                  <tr key={user.id}>
                    <td>{user.name}</td>
                    <td>{user.lastName}</td>
                    <td>{user.email}</td>
                    <td>{user.role}</td>
                    <td>{formatDate(user.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === 'stations' && stations && (
            <table>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Ubicación</th>
                  <th>Sensor</th>
                  <th>Estado</th>
                  <th>Proveedor</th>
                  <th>Creada</th>
                </tr>
              </thead>
              <tbody>
                {paginate(stations, page, PAGE_SIZE).map((station) => (
                  <tr key={station.id}>
                    <td>{station.name}</td>
                    <td>
                      {station.location.latitude}, {station.location.longitude}
                    </td>
                    <td>{station.sensorModel}</td>
                    <td>{station.status}</td>
                    <td>{station.provider}</td>
                    <td>{formatDate(station.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === 'measurements' && measurements && (
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Estación</th>
                  <th>Temp (°C)</th>
                  <th>Humedad (%)</th>
                  <th>Presión (hPa)</th>
                  <th>Fuente</th>
                  <th>Alerta</th>
                </tr>
              </thead>
              <tbody>
                {paginate(measurements, page, PAGE_SIZE).map((measurement) => (
                  <tr
                    key={measurement.id}
                    className={measurement.alertStatus ? 'row-alert' : undefined}
                  >
                    <td>{formatDate(measurement.reportedAt)}</td>
                    <td>
                      <code>{measurement.stationId}</code>
                    </td>
                    <td>{measurement.temperature}</td>
                    <td>{measurement.humidity}</td>
                    <td>{measurement.pressure}</td>
                    <td>{measurement.source}</td>
                    <td>
                      {measurement.alertStatus
                        ? ALERT_TYPE_LABELS[measurement.alertType]
                        : ALERT_TYPE_LABELS.NONE}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === 'profiles' && profiles && (
            <table>
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Suscripciones</th>
                  <th>Telegram</th>
                  <th>Log</th>
                  <th>In-app</th>
                </tr>
              </thead>
              <tbody>
                {profiles.items.map((profile) => (
                  <tr key={profile.userId}>
                    <td>
                      <code>{profile.userId}</code>
                    </td>
                    <td>
                      {profile.notificationPreferences.length === 0
                        ? '—'
                        : profile.notificationPreferences
                            .map(
                              (preference) =>
                                `${preference.stationId} (${preference.alertTypes.length})`,
                            )
                            .join(', ')}
                    </td>
                    <td>
                      {profile.deliveryChannels.telegram.chatId ?? 'No vinculado'}
                    </td>
                    <td>{profile.deliveryChannels.log.enabled ? 'Sí' : 'No'}</td>
                    <td>{profile.deliveryChannels.inApp ? 'Sí' : 'No'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === 'notifications' && notifications && (
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Usuario</th>
                  <th>Estación</th>
                  <th>Alerta</th>
                  <th>Temp</th>
                  <th>Humedad</th>
                  <th>Presión</th>
                  <th>Leída</th>
                </tr>
              </thead>
              <tbody>
                {notifications.items.map((notification) => (
                  <tr key={notification.id}>
                    <td>{formatDate(notification.createdAt)}</td>
                    <td>
                      <code>{notification.userId}</code>
                    </td>
                    <td>{notification.stationName}</td>
                    <td>{ALERT_TYPE_LABELS[notification.alertType]}</td>
                    <td>{notification.temperature}</td>
                    <td>{notification.humidity}</td>
                    <td>{notification.pressure}</td>
                    <td>
                      {notification.readAt
                        ? formatDate(notification.readAt)
                        : 'No'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div className="pagination-actions">
            <button
              type="button"
              className="secondary"
              onClick={() => setPage(page - 1)}
              disabled={page <= 1}
            >
              Anterior
            </button>
            <span className="muted">
              Página {Math.min(page, pages)} de {pages} · {total} registros
            </span>
            <button
              type="button"
              className="secondary"
              onClick={() => setPage(page + 1)}
              disabled={page >= pages}
            >
              Siguiente
            </button>
          </div>
        </>
      )}
    </section>
  );
}
