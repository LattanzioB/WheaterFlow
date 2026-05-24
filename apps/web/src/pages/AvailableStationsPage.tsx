import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useApiErrorMessage } from '../auth/AuthContext';
import { ErrorBanner } from '../components/ErrorBanner';
import { fetchAvailableStations } from '../api/weatherflow';
import type { WeatherStation } from '../api/types';

export function AvailableStationsPage() {
  const [stations, setStations] = useState<WeatherStation[]>([]);
  const [nameFilter, setNameFilter] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async (name?: string) => {
    setLoading(true);
    setError(null);
    try {
      setStations(await fetchAvailableStations(name));
    } catch (err) {
      setError(useApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const onFilter = (event: FormEvent) => {
    event.preventDefault();
    void load(nameFilter || undefined);
  };

  return (
    <section>
      <h1>Estaciones disponibles</h1>
      <p className="lead">
        Estaciones de todos los usuarios. Usá esta lista para suscribirte en{' '}
        <Link to="/subscriptions">Suscripciones</Link>.
      </p>
      <ErrorBanner message={error} />
      <form onSubmit={onFilter} className="form-inline panel">
        <label>
          Filtrar por nombre
          <input
            value={nameFilter}
            onChange={(e) => setNameFilter(e.target.value)}
          />
        </label>
        <button type="submit" className="secondary">
          Buscar
        </button>
      </form>
      {loading ? (
        <p className="muted">Cargando…</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Propietario</th>
              <th>ID estación</th>
            </tr>
          </thead>
          <tbody>
            {stations.map((station) => (
              <tr key={station.id}>
                <td>{station.name}</td>
                <td>
                  <code>{station.ownerId}</code>
                </td>
                <td>
                  <code>{station.id}</code>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
