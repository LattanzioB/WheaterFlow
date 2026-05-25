import { ALERT_TYPE_LABELS } from '../api/types';
import { updateDeliveryChannels } from '../api/weatherflow';
import { useAuth, useApiErrorMessage } from '../auth/AuthContext';
import { ErrorBanner } from '../components/ErrorBanner';
import { useEffect, useState } from 'react';

export function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [inAppEnabled, setInAppEnabled] = useState(
    user?.deliveryChannels.inApp ?? true,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setInAppEnabled(user.deliveryChannels.inApp);
    }
  }, [user]);

  if (!user) {
    return null;
  }

  const handleInAppToggle = async () => {
    const previous = inAppEnabled;
    const next = !previous;
    setInAppEnabled(next);
    setSaving(true);
    setError(null);
    try {
      await updateDeliveryChannels(user.id, {
        inApp: next,
      });
      await refreshUser();
    } catch (err) {
      setInAppEnabled(previous);
      setError(useApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section>
      <h1>Perfil</h1>
      {error ? <ErrorBanner message={error} /> : null}
      <dl className="detail-list">
        <dt>Nombre</dt>
        <dd>
          {user.name} {user.lastName}
        </dd>
        <dt>Email</dt>
        <dd>{user.email}</dd>
        <dt>ID</dt>
        <dd>
          <code>{user.id}</code>
        </dd>
        <dt>Registro</dt>
        <dd>{new Date(user.createdAt).toLocaleString('es-AR')}</dd>
      </dl>
      <h2>Canales de entrega</h2>
      <div className="panel">
        <label className="toggle-row">
          <span>
            <strong>Notificaciones en la app</strong>
            <small>Alertas en tiempo real y en el historial interno.</small>
          </span>
          <input
            type="checkbox"
            checked={inAppEnabled}
            disabled={saving}
            onChange={handleInAppToggle}
          />
        </label>
      </div>
      <h2>Preferencias de alerta</h2>
      {user.notificationPreferences.length === 0 ? (
        <p className="muted">Sin suscripciones activas.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Estación</th>
              <th>Tipos de alerta</th>
            </tr>
          </thead>
          <tbody>
            {user.notificationPreferences.map((pref) => (
              <tr key={pref.stationId}>
                <td>
                  <code>{pref.stationId}</code>
                </td>
                <td>
                  {pref.alertTypes
                    .map((type) => ALERT_TYPE_LABELS[type])
                    .join(', ')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
