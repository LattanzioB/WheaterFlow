import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { NotificationsBell } from './NotificationsBell';
import { ToastHost } from './ToastHost';

const navItems = [
  { to: '/', label: 'Inicio', end: true },
  { to: '/profile', label: 'Perfil' },
  { to: '/stations', label: 'Mis estaciones' },
  { to: '/stations/available', label: 'Estaciones disponibles' },
  { to: '/measurements', label: 'Mediciones' },
  { to: '/subscriptions', label: 'Suscripciones' },
  { to: '/notifications', label: 'Notificaciones' },
];

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="layout">
      <header className="topbar">
        <Link to="/" className="brand">
          WeatherFlow
        </Link>
        <div className="session">
          <NotificationsBell />
          <span>
            {user?.name} {user?.lastName}
          </span>
          <button type="button" className="secondary" onClick={handleLogout}>
            Cerrar sesión
          </button>
        </div>
      </header>
      <div className="body">
        <nav className="sidebar">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                isActive ? 'nav-link active' : 'nav-link'
              }
            >
              {item.label}
            </NavLink>
          ))}
          <p className="nav-hint">
            Para demo multi-usuario: cerrá sesión e ingresá con otra cuenta.
          </p>
        </nav>
        <main className="content">
          <Outlet />
          <ToastHost />
        </main>
      </div>
    </div>
  );
}
