export type AlertType =
  | 'NONE'
  | 'EXTREME_HEAT'
  | 'FROST'
  | 'STORM'
  | 'CRITICAL_HUMIDITY';

export const ALERT_TYPE_LABELS: Record<AlertType, string> = {
  NONE: 'Ninguna',
  EXTREME_HEAT: 'Calor extremo',
  FROST: 'Helada',
  STORM: 'Tormenta',
  CRITICAL_HUMIDITY: 'Humedad crítica',
};

export const SUBSCRIBABLE_ALERT_TYPES: AlertType[] = [
  'EXTREME_HEAT',
  'FROST',
  'STORM',
  'CRITICAL_HUMIDITY',
];

export interface ApiErrorBody {
  statusCode?: number;
  message?: string | string[];
  error?: string;
}

export interface AuthResponse {
  access_token: string;
}

export interface UserProfile {
  id: string;
  name: string;
  lastName: string;
  email: string;
  notificationPreferences: {
    stationId: string;
    alertTypes: AlertType[];
  }[];
  createdAt: string;
}

export interface WeatherStation {
  id: string;
  name: string;
  location: { latitude: number; longitude: number };
  sensorModel: string;
  status: string;
  ownerId: string;
  alertSettings?: {
    extremeHeat: boolean;
    frost: boolean;
    storm: boolean;
    criticalHumidity: boolean;
  };
  createdAt: string;
}

export interface Measurement {
  id: string;
  stationId: string;
  temperature: number;
  humidity: number;
  pressure: number;
  reportedAt: string;
  alertStatus: boolean;
  alertType: AlertType;
}

export interface SubscribedStationSummary {
  stationId: string;
  alertTypes: AlertType[];
  station: WeatherStation | null;
  latestMeasurement: Measurement | null;
  hasActiveAlert: boolean;
}

export interface MeasurementFilters {
  stationName?: string;
  tempMin?: number;
  tempMax?: number;
  humidityMin?: number;
  humidityMax?: number;
  pressureMin?: number;
  pressureMax?: number;
  reportedFrom?: string;
  reportedTo?: string;
  alertOnly?: boolean;
}
