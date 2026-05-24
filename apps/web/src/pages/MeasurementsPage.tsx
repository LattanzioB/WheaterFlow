import { useEffect, useState, type FormEvent } from 'react';
import { useApiErrorMessage } from '../auth/AuthContext';
import { ErrorBanner } from '../components/ErrorBanner';
import {
  createMeasurement,
  fetchMyStations,
  queryMeasurements,
} from '../api/weatherflow';
import {
  ALERT_TYPE_LABELS,
  type Measurement,
  type MeasurementFilters,
  type WeatherStation,
} from '../api/types';

export function MeasurementsPage() {
  const [stations, setStations] = useState<WeatherStation[]>([]);
  const [items, setItems] = useState<Measurement[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [lastCreated, setLastCreated] = useState<Measurement | null>(null);

  const [stationId, setStationId] = useState('');
  const [temperature, setTemperature] = useState('22');
  const [humidity, setHumidity] = useState('55');
  const [pressure, setPressure] = useState('1013');

  const [filters, setFilters] = useState<MeasurementFilters>({
    alertOnly: false,
  });

  useEffect(() => {
    void (async () => {
      try {
        const owned = await fetchMyStations();
        setStations(owned);
        if (owned[0]) {
          setStationId(owned[0].id);
        }
        setItems(await queryMeasurements({}));
      } catch (err) {
        setError(useApiErrorMessage(err));
      }
    })();
  }, []);

  const onCreate = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      const created = await createMeasurement({
        stationId,
        temperature: Number(temperature),
        humidity: Number(humidity),
        pressure: Number(pressure),
      });
      setLastCreated(created);
      setItems(await queryMeasurements(filters));
    } catch (err) {
      setError(useApiErrorMessage(err));
    }
  };

  const onSearch = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      setItems(await queryMeasurements(filters));
    } catch (err) {
      setError(useApiErrorMessage(err));
    }
  };

  return (
    <section>
      <h1>Mediciones</h1>
      <ErrorBanner message={error} />

      <form onSubmit={onCreate} className="form panel">
        <h2>Registrar medición</h2>
        <label>
          Estación
          <select
            value={stationId}
            onChange={(e) => setStationId(e.target.value)}
            required
          >
            {stations.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <div className="form-row">
          <label>
            Temp. (°C)
            <input
              type="number"
              step="any"
              value={temperature}
              onChange={(e) => setTemperature(e.target.value)}
            />
          </label>
          <label>
            Humedad (%)
            <input
              type="number"
              step="any"
              value={humidity}
              onChange={(e) => setHumidity(e.target.value)}
            />
          </label>
          <label>
            Presión (hPa)
            <input
              type="number"
              step="any"
              value={pressure}
              onChange={(e) => setPressure(e.target.value)}
            />
          </label>
        </div>
        <button type="submit">Registrar</button>
      </form>

      {lastCreated && (
        <div
          className={
            lastCreated.alertStatus ? 'banner warning' : 'banner success'
          }
        >
          Última medición: alerta{' '}
          {lastCreated.alertStatus ? 'SÍ' : 'NO'} —{' '}
          {ALERT_TYPE_LABELS[lastCreated.alertType]}
        </div>
      )}

      <form onSubmit={onSearch} className="form panel">
        <h2>Buscar mediciones</h2>
        <div className="form-row">
          <label>
            Nombre estación
            <input
              value={filters.stationName ?? ''}
              onChange={(e) =>
                setFilters({ ...filters, stationName: e.target.value })
              }
            />
          </label>
          <label>
            Temp. mín
            <input
              type="number"
              value={filters.tempMin ?? ''}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  tempMin: e.target.value ? Number(e.target.value) : undefined,
                })
              }
            />
          </label>
          <label>
            Temp. máx
            <input
              type="number"
              value={filters.tempMax ?? ''}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  tempMax: e.target.value ? Number(e.target.value) : undefined,
                })
              }
            />
          </label>
        </div>
        <div className="form-row">
          <label>
            Desde
            <input
              type="datetime-local"
              onChange={(e) =>
                setFilters({
                  ...filters,
                  reportedFrom: e.target.value
                    ? new Date(e.target.value).toISOString()
                    : undefined,
                })
              }
            />
          </label>
          <label>
            Hasta
            <input
              type="datetime-local"
              onChange={(e) =>
                setFilters({
                  ...filters,
                  reportedTo: e.target.value
                    ? new Date(e.target.value).toISOString()
                    : undefined,
                })
              }
            />
          </label>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={Boolean(filters.alertOnly)}
              onChange={(e) =>
                setFilters({ ...filters, alertOnly: e.target.checked })
              }
            />
            Solo alertas
          </label>
        </div>
        <button type="submit" className="secondary">
          Aplicar filtros
        </button>
      </form>

      <table>
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Estación</th>
            <th>Temp</th>
            <th>Humedad</th>
            <th>Presión</th>
            <th>Alerta</th>
          </tr>
        </thead>
        <tbody>
          {items.map((m) => (
            <tr key={m.id} className={m.alertStatus ? 'row-alert' : undefined}>
              <td>{new Date(m.reportedAt).toLocaleString('es-AR')}</td>
              <td>
                <code>{m.stationId}</code>
              </td>
              <td>{m.temperature}</td>
              <td>{m.humidity}</td>
              <td>{m.pressure}</td>
              <td>
                {m.alertStatus
                  ? ALERT_TYPE_LABELS[m.alertType]
                  : ALERT_TYPE_LABELS.NONE}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
