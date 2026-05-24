import { ALERT_TYPE_LABELS } from '../api/types';
import { useAuth } from '../auth/AuthContext';

export function ProfilePage() {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  return (
    <section>
      <h1>Perfil</h1>
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
