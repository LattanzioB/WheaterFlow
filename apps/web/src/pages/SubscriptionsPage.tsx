import { useEffect, useState, type FormEvent } from 'react';
import { useAuth, useApiErrorMessage } from '../auth/AuthContext';
import { AlertTypeCheckboxes } from '../components/AlertTypeCheckboxes';
import { ErrorBanner } from '../components/ErrorBanner';
import {
  fetchAvailableStations,
  fetchSubscriptions,
  subscribeToStation,
  unsubscribeFromStation,
  updateSubscription,
} from '../api/weatherflow';
import {
  ALERT_TYPE_LABELS,
  SUBSCRIBABLE_ALERT_TYPES,
  type AlertType,
  type SubscribedStationSummary,
  type WeatherStation,
} from '../api/types';

export function SubscriptionsPage() {
  const { user, refreshUser } = useAuth();
  const [subscriptions, setSubscriptions] = useState<SubscribedStationSummary[]>(
    [],
  );
  const [available, setAvailable] = useState<WeatherStation[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [newStationId, setNewStationId] = useState('');
  const [newAlertTypes, setNewAlertTypes] = useState<AlertType[]>([
    ...SUBSCRIBABLE_ALERT_TYPES,
  ]);

  const load = async () => {
    if (!user) {
      return;
    }
    setError(null);
    try {
      const [subs, stations] = await Promise.all([
        fetchSubscriptions(user.id),
        fetchAvailableStations(),
      ]);
      setSubscriptions(subs);
      setAvailable(stations.filter((s) => s.ownerId !== user.id));
      if (!newStationId && stations[0]) {
        setNewStationId(stations[0].id);
      }
    } catch (err) {
      setError(useApiErrorMessage(err));
    }
  };

  useEffect(() => {
    void load();
  }, [user?.id]);

  const onSubscribe = async (event: FormEvent) => {
    event.preventDefault();
    if (!user || newAlertTypes.length === 0) {
      setError('Seleccioná al menos un tipo de alerta.');
      return;
    }
    setError(null);
    try {
      await subscribeToStation(user.id, newStationId, newAlertTypes);
      await refreshUser();
      await load();
    } catch (err) {
      setError(useApiErrorMessage(err));
    }
  };

  const onUnsubscribe = async (stationId: string) => {
    if (!user) {
      return;
    }
    setError(null);
    try {
      await unsubscribeFromStation(user.id, stationId);
      await refreshUser();
      await load();
    } catch (err) {
      setError(useApiErrorMessage(err));
    }
  };

  const onUpdateTypes = async (stationId: string, alertTypes: AlertType[]) => {
    if (!user) {
      return;
    }
    setError(null);
    try {
      await updateSubscription(user.id, stationId, alertTypes);
      await refreshUser();
      await load();
    } catch (err) {
      setError(useApiErrorMessage(err));
    }
  };

  return (
    <section>
      <h1>Suscripciones a alertas</h1>
      <ErrorBanner message={error} />

      <form onSubmit={onSubscribe} className="form panel">
        <h2>Suscribirse a una estación</h2>
        <label>
          Estación
          <select
            value={newStationId}
            onChange={(e) => setNewStationId(e.target.value)}
          >
            {available.map((station) => (
              <option key={station.id} value={station.id}>
                {station.name} (propietario: {station.ownerId.slice(0, 8)}…)
              </option>
            ))}
          </select>
        </label>
        <AlertTypeCheckboxes
          selected={newAlertTypes}
          onChange={setNewAlertTypes}
        />
        <button type="submit">Suscribirse</button>
      </form>

      <h2>Mis suscripciones</h2>
      {subscriptions.length === 0 ? (
        <p className="muted">No estás suscrito a ninguna estación ajena.</p>
      ) : (
        <div className="stack">
          {subscriptions.map((sub) => (
            <article key={sub.stationId} className="panel">
              <h3>{sub.station?.name ?? sub.stationId}</h3>
              <p>
                Tipos:{' '}
                {sub.alertTypes
                  .map((t) => ALERT_TYPE_LABELS[t])
                  .join(', ')}
              </p>
              {sub.hasActiveAlert && (
                <p className="tag-alert">Alerta activa en última medición</p>
              )}
              <AlertTypeCheckboxes
                selected={sub.alertTypes}
                onChange={(types) => void onUpdateTypes(sub.stationId, types)}
              />
              <button
                type="button"
                className="danger"
                onClick={() => void onUnsubscribe(sub.stationId)}
              >
                Cancelar suscripción
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
