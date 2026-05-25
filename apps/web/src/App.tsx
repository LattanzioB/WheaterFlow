import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { NotificationsProvider } from './notifications/NotificationsContext';
import { AvailableStationsPage } from './pages/AvailableStationsPage';
import { DashboardPage } from './pages/DashboardPage';
import { LoginPage } from './pages/LoginPage';
import { MeasurementsPage } from './pages/MeasurementsPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { ProfilePage } from './pages/ProfilePage';
import { RegisterPage } from './pages/RegisterPage';
import { StationDetailPage } from './pages/StationDetailPage';
import { StationsPage } from './pages/StationsPage';
import { SubscriptionsPage } from './pages/SubscriptionsPage';

export function App() {
  return (
    <AuthProvider>
      <NotificationsProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                <Route index element={<DashboardPage />} />
                <Route path="profile" element={<ProfilePage />} />
                <Route path="stations" element={<StationsPage />} />
                <Route
                  path="stations/available"
                  element={<AvailableStationsPage />}
                />
                <Route path="stations/:id" element={<StationDetailPage />} />
                <Route path="measurements" element={<MeasurementsPage />} />
                <Route path="subscriptions" element={<SubscriptionsPage />} />
                <Route path="notifications" element={<NotificationsPage />} />
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </NotificationsProvider>
    </AuthProvider>
  );
}
