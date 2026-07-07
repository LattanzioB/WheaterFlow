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

export type WeatherProvider = 'none' | 'openweather';
export type MeasurementSource = 'manual' | 'openweather';

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
  deliveryChannels: {
    telegram: {
      chatId: string | null;
    };
    log: {
      enabled: boolean;
    };
    inApp: boolean;
  };
  createdAt: string;
}

export interface TelegramLinkCode {
  code: string;
  expiresAt: string;
  instructions: string;
  botUsername?: string;
  botUrl?: string;
}

export interface WeatherStation {
  id: string;
  name: string;
  location: { latitude: number; longitude: number };
  sensorModel: string;
  status: string;
  ownerId: string;
  provider: WeatherProvider;
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
  source: MeasurementSource;
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

export interface Notification {
  id: string;
  userId: string;
  stationId: string;
  stationName: string;
  alertType: AlertType;
  temperature: number;
  humidity: number;
  pressure: number;
  reportedAt: string;
  createdAt: string;
  readAt: string | null;
  messageId: string;
}

export interface NotificationsPage {
  items: Notification[];
  nextCursor: string | null;
  unreadCount: number;
}

export type AppNotification = Notification;
export type NotificationsPageResult = NotificationsPage;

export type UserRole = 'USER' | 'ADMIN';

export interface UserDirectoryItem {
  id: string;
  name: string;
  lastName: string;
  email: string;
  role: UserRole;
  createdAt: string;
}

export interface UsersDirectoryPage {
  items: UserDirectoryItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface NotificationProfile {
  userId: string;
  notificationPreferences: {
    stationId: string;
    alertTypes: AlertType[];
  }[];
  deliveryChannels: {
    telegram: { chatId: string | null };
    log: { enabled: boolean };
    inApp: boolean;
  };
}

export interface NotificationProfilesPage {
  items: NotificationProfile[];
  total: number;
  limit: number;
  offset: number;
}

export interface NotificationsCollectionPage {
  items: Notification[];
  total: number;
  limit: number;
  offset: number;
}
