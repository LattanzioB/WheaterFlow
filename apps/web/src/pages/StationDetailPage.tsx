import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useApiErrorMessage } from '../auth/AuthContext';
import { ErrorBanner } from '../components/ErrorBanner';
import {
  deleteStation,
  fetchStation,
  updateStation,
} from '../api/weatherflow';
import type { WeatherStation } from '../api/types';

export function StationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [station, setStation] = useState<WeatherStation | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [status, setStatus] = useState('ACTIVE');
  const [sensorModel, setSensorModel] = useState('');

  useEffect(() => {
    if (!id) {
      return;
    }
    void (async () => {
      try {
        const data = await fetchStation(id);
        setStation(data);
        setName(data.name);
        setStatus(data.status);
        setSensorModel(data.sensorModel);
      } catch (err) {
        setError(useApiErrorMessage(err));
      }
    })();
  }, [id]);

  const onSave = async (event: FormEvent) => {
    event.preventDefault();
    if (!id) {
      return;
    }
    setError(null);
    try {
      const updated = await updateStation(id, { name, status, sensorModel });
      setStation(updated);
    } catch (err) {
      setError(useApiErrorMessage(err));
    }
  };

  const onDelete = async () => {
    if (!id || !confirm('¿Eliminar esta estación?')) {
      return;
    }
    setError(null);
    try {
      await deleteStation(id);
      navigate('/stations');
    } catch (err) {
      setError(useApiErrorMessage(err));
    }
  };

  if (!station && !error) {
    return <p className="muted">Cargando estación…</p>;
  }

  return (
    <section>
      <p>
        <Link to="/stations">← Volver</Link>
      </p>
      <h1>{station?.name ?? 'Estación'}</h1>
      <ErrorBanner message={error} />
      {station && (
        <>
          <form onSubmit={onSave} className="form panel">
            <label>
              Nombre
              <input value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label>
              Estado
              <select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
            </label>
            <label>
              Modelo sensor
              <input
                value={sensorModel}
                onChange={(e) => setSensorModel(e.target.value)}
              />
            </label>
            <button type="submit">Guardar cambios</button>
          </form>
          <button type="button" className="danger" onClick={() => void onDelete()}>
            Eliminar estación
          </button>
        </>
      )}
    </section>
  );
}
