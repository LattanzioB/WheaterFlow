import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useApiErrorMessage } from '../auth/AuthContext';
import { ErrorBanner } from '../components/ErrorBanner';
import {
  createStation,
  fetchMyStations,
} from '../api/weatherflow';
import type { WeatherStation } from '../api/types';

export function StationsPage() {
  const [stations, setStations] = useState<WeatherStation[]>([]);
  const [nameFilter, setNameFilter] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [formName, setFormName] = useState('');
  const [latitude, setLatitude] = useState('-34.6037');
  const [longitude, setLongitude] = useState('-58.3816');
  const [sensorModel, setSensorModel] = useState('BME280');

  const load = async (name?: string) => {
    setLoading(true);
    setError(null);
    try {
      setStations(await fetchMyStations(name));
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

  const onCreate = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      await createStation({
        name: formName,
        location: {
          latitude: Number(latitude),
          longitude: Number(longitude),
        },
        sensorModel,
        status: 'ACTIVE',
      });
      setFormName('');
      await load(nameFilter || undefined);
    } catch (err) {
      setError(useApiErrorMessage(err));
    }
  };

  return (
    <section>
      <h1>Mis estaciones</h1>
      <ErrorBanner message={error} />

      <form onSubmit={onCreate} className="form panel">
        <h2>Nueva estación</h2>
        <div className="form-row">
          <label>
            Nombre
            <input
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              required
            />
          </label>
          <label>
            Modelo sensor
            <input
              value={sensorModel}
              onChange={(e) => setSensorModel(e.target.value)}
              required
            />
          </label>
        </div>
        <div className="form-row">
          <label>
            Latitud
            <input
              type="number"
              step="any"
              value={latitude}
              onChange={(e) => setLatitude(e.target.value)}
              required
            />
          </label>
          <label>
            Longitud
            <input
              type="number"
              step="any"
              value={longitude}
              onChange={(e) => setLongitude(e.target.value)}
              required
            />
          </label>
        </div>
        <button type="submit">Crear estación</button>
      </form>

      <form onSubmit={onFilter} className="form-inline panel">
        <label>
          Filtrar por nombre
          <input
            value={nameFilter}
            onChange={(e) => setNameFilter(e.target.value)}
            placeholder="Ej. Central"
          />
        </label>
        <button type="submit" className="secondary">
          Buscar
        </button>
      </form>

      {loading ? (
        <p className="muted">Cargando…</p>
      ) : stations.length === 0 ? (
        <p className="muted">No hay estaciones.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Estado</th>
              <th>Ubicación</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {stations.map((station) => (
              <tr key={station.id}>
                <td>{station.name}</td>
                <td>{station.status}</td>
                <td>
                  {station.location.latitude.toFixed(4)},{' '}
                  {station.location.longitude.toFixed(4)}
                </td>
                <td>
                  <Link to={`/stations/${station.id}`}>Ver / editar</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
