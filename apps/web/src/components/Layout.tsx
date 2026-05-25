import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useNotifications } from '../notifications/NotificationsContext';
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
  const { unreadCount } = useNotifications();
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
              <span className="nav-link-content">
                {item.to === '/notifications' ? (
                  <BellIcon />
                ) : null}
                <span>{item.label}</span>
              </span>
              {item.to === '/notifications' && unreadCount > 0 ? (
                <span className="nav-badge">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              ) : null}
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

function BellIcon() {
  return (
    <svg
      aria-hidden="true"
      className="nav-icon"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}
