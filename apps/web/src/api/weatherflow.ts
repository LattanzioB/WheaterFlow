import { apiRequest, buildQuery } from './client';
import type {
  AlertType,
  AuthResponse,
  Measurement,
  MeasurementFilters,
  SubscribedStationSummary,
  UserProfile,
  WeatherStation,
} from './types';

export function registerUser(payload: {
  name: string;
  lastName: string;
  email: string;
  password: string;
}): Promise<AuthResponse> {
  return apiRequest('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function loginUser(payload: {
  email: string;
  password: string;
}): Promise<AuthResponse> {
  return apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function fetchCurrentUser(): Promise<UserProfile> {
  return apiRequest('/users/me');
}

export function fetchMyStations(name?: string): Promise<WeatherStation[]> {
  return apiRequest(`/weather-stations${buildQuery({ name })}`);
}

export function fetchAvailableStations(
  name?: string,
): Promise<WeatherStation[]> {
  return apiRequest(`/weather-stations/available${buildQuery({ name })}`);
}

export function fetchStation(id: string): Promise<WeatherStation> {
  return apiRequest(`/weather-stations/${id}`);
}

export function createStation(payload: {
  name: string;
  location: { latitude: number; longitude: number };
  sensorModel: string;
  status?: string;
}): Promise<WeatherStation> {
  return apiRequest('/weather-stations', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateStation(
  id: string,
  payload: Partial<{
    name: string;
    location: { latitude: number; longitude: number };
    sensorModel: string;
    status: string;
  }>,
): Promise<WeatherStation> {
  return apiRequest(`/weather-stations/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function deleteStation(id: string): Promise<void> {
  return apiRequest(`/weather-stations/${id}`, { method: 'DELETE' });
}

export function createMeasurement(payload: {
  stationId: string;
  temperature: number;
  humidity: number;
  pressure: number;
  reportedAt?: string;
}): Promise<Measurement> {
  return apiRequest('/measurements', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function queryMeasurements(
  filters: MeasurementFilters,
): Promise<Measurement[]> {
  return apiRequest(
    `/measurements${buildQuery({
      stationName: filters.stationName,
      tempMin: filters.tempMin,
      tempMax: filters.tempMax,
      humidityMin: filters.humidityMin,
      humidityMax: filters.humidityMax,
      pressureMin: filters.pressureMin,
      pressureMax: filters.pressureMax,
      reportedFrom: filters.reportedFrom,
      reportedTo: filters.reportedTo,
      alertOnly: filters.alertOnly,
    })}`,
  );
}

export function fetchSubscriptions(
  userId: string,
): Promise<SubscribedStationSummary[]> {
  return apiRequest(`/users/${userId}/subscriptions`);
}

export function subscribeToStation(
  userId: string,
  stationId: string,
  alertTypes: AlertType[],
): Promise<UserProfile> {
  return apiRequest(`/users/${userId}/subscriptions/${stationId}`, {
    method: 'POST',
    body: JSON.stringify({ alertTypes }),
  });
}

export function updateSubscription(
  userId: string,
  stationId: string,
  alertTypes: AlertType[],
): Promise<UserProfile> {
  return apiRequest(`/users/${userId}/subscriptions/${stationId}`, {
    method: 'PATCH',
    body: JSON.stringify({ alertTypes }),
  });
}

export function unsubscribeFromStation(
  userId: string,
  stationId: string,
): Promise<UserProfile> {
  return apiRequest(`/users/${userId}/subscriptions/${stationId}`, {
    method: 'DELETE',
  });
}
