import {
  ALERT_NOTIFIER_TOKEN,
  ALERT_PUBLISHER_TOKEN,
  MEASUREMENT_REPOSITORY_TOKEN,
  PASSWORD_HASHER_TOKEN,
  NOTIFICATION_REPOSITORY_TOKEN,
  STATION_REPOSITORY_TOKEN,
  TOKEN_SERVICE_TOKEN,
  USER_REPOSITORY_TOKEN,
} from './injection-tokens';

describe('injection tokens', () => {
  it('exposes stable identifiers for repositories and services', () => {
    expect(USER_REPOSITORY_TOKEN).toBe('IUserRepository');
    expect(STATION_REPOSITORY_TOKEN).toBe('IStationRepository');
    expect(MEASUREMENT_REPOSITORY_TOKEN).toBe('IMeasurementRepository');
    expect(ALERT_PUBLISHER_TOKEN).toBe('AlertPublisher');
    expect(PASSWORD_HASHER_TOKEN).toBe('PasswordHasher');
    expect(TOKEN_SERVICE_TOKEN).toBe('TokenService');
    expect(ALERT_NOTIFIER_TOKEN).toBe('AlertNotifier');
    expect(NOTIFICATION_REPOSITORY_TOKEN).toBe('INotificationRepository');
  });
});
