import { useEffect, useState, type FormEvent } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useApiErrorMessage } from '../auth/AuthContext';
import { ErrorBanner } from '../components/ErrorBanner';
import { fetchAvailableStations, queryMeasurements } from '../api/weatherflow';
import type { WeatherStation } from '../api/types';
import {
  buildSeriesPoints,
  METRIC_KEYS,
  METRIC_LABELS,
  toggleMetric,
  type MetricKey,
  type SeriesPoint,
} from './data-series-page-state';

const METRIC_COLORS: Record<MetricKey, string> = {
  temperature: '#2a78d6',
  humidity: '#1baf7a',
  pressure: '#eda100',
};

function formatTick(timestamp: number): string {
  return new Date(timestamp).toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatTooltipLabel(timestamp: number): string {
  return new Date(timestamp).toLocaleString('es-AR');
}

export function DataSeriesPage() {
  const [stations, setStations] = useState<WeatherStation[]>([]);
  const [stationName, setStationName] = useState('');
  const [fromValue, setFromValue] = useState('');
  const [toValue, setToValue] = useState('');
  const [metrics, setMetrics] = useState<MetricKey[]>(['temperature']);
  const [points, setPoints] = useState<SeriesPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSeries = async (name: string, from: string, to: string) => {
    setLoading(true);
    setError(null);
    try {
      const measurements = await queryMeasurements({
        stationName: name || undefined,
        reportedFrom: from ? new Date(from).toISOString() : undefined,
        reportedTo: to ? new Date(to).toISOString() : undefined,
      });
      setPoints(buildSeriesPoints(measurements));
    } catch (err) {
      setError(useApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void (async () => {
      try {
        const available = await fetchAvailableStations();
        setStations(available);
        const first = available[0]?.name ?? '';
        setStationName(first);
        await loadSeries(first, '', '');
      } catch (err) {
        setError(useApiErrorMessage(err));
      }
    })();
  }, []);

  const onSearch = async (event: FormEvent) => {
    event.preventDefault();
    await loadSeries(stationName, fromValue, toValue);
  };

  return (
    <section>
      <h1>Datos · Series de tiempo</h1>
      <p className="lead">
        Evolución de las mediciones persistidas en MongoDB por estación, rango
        de fechas y métrica.
      </p>
      <ErrorBanner message={error} />

      <form onSubmit={onSearch} className="form panel">
        <div className="form-row">
          <label>
            Estación
            <select
              value={stationName}
              onChange={(e) => setStationName(e.target.value)}
            >
              {stations.map((station) => (
                <option key={station.id} value={station.name}>
                  {station.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Desde
            <input
              type="datetime-local"
              value={fromValue}
              onChange={(e) => setFromValue(e.target.value)}
            />
          </label>
          <label>
            Hasta
            <input
              type="datetime-local"
              value={toValue}
              onChange={(e) => setToValue(e.target.value)}
            />
          </label>
        </div>
        <div className="checkbox-group">
          {METRIC_KEYS.map((metric) => (
            <label key={metric} className="checkbox">
              <input
                type="checkbox"
                checked={metrics.includes(metric)}
                onChange={() => setMetrics(toggleMetric(metrics, metric))}
              />
              {METRIC_LABELS[metric]}
            </label>
          ))}
        </div>
        <button type="submit" disabled={loading}>
          {loading ? 'Cargando...' : 'Actualizar gráfico'}
        </button>
      </form>

      {!loading && points.length === 0 ? (
        <p className="muted empty-state">
          Sin mediciones para los filtros seleccionados
        </p>
      ) : (
        metrics.map((metric) => (
          <div key={metric} className="panel">
            <h2>{METRIC_LABELS[metric]}</h2>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart
                data={points}
                margin={{ top: 8, right: 16, bottom: 8, left: 0 }}
              >
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                <XAxis
                  dataKey="timestamp"
                  type="number"
                  domain={['dataMin', 'dataMax']}
                  tickFormatter={formatTick}
                  tick={{ fontSize: 12, fill: '#64748b' }}
                  stroke="#94a3b8"
                />
                <YAxis
                  domain={['auto', 'auto']}
                  tick={{ fontSize: 12, fill: '#64748b' }}
                  stroke="#94a3b8"
                  width={70}
                />
                <Tooltip
                  labelFormatter={(value) =>
                    formatTooltipLabel(Number(value))
                  }
                  formatter={(value) => [
                    String(value),
                    METRIC_LABELS[metric],
                  ]}
                />
                <Line
                  type="monotone"
                  dataKey={metric}
                  stroke={METRIC_COLORS[metric]}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ))
      )}
    </section>
  );
}
