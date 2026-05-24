import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export function DashboardPage() {
  const { user } = useAuth();

  return (
    <section>
      <h1>Bienvenido/a, {user?.name}</h1>
      <p className="lead">
        Interfaz para ejecutar los casos de uso de WeatherFlow contra la API REST.
      </p>
      <div className="card-grid">
        <Link to="/stations" className="card">
          <h2>Mis estaciones</h2>
          <p>Alta, edición y búsqueda de estaciones propias.</p>
        </Link>
        <Link to="/measurements" className="card">
          <h2>Mediciones</h2>
          <p>Registrar lecturas y consultar alertas detectadas.</p>
        </Link>
        <Link to="/subscriptions" className="card">
          <h2>Suscripciones</h2>
          <p>Recibir alertas de estaciones de otros usuarios.</p>
        </Link>
      </div>
    </section>
  );
}
