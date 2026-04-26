import { MeasurementSchema } from './modules/measurements/infrastructure/persistence/measurement.schema';
import { WeatherStationSchema } from './modules/stations/infrastructure/persistence/weather-station.schema';
import { UserSchema } from './modules/users/infrastructure/persistence/user.schema';

describe('Database schema documentation contract', () => {
  it('keeps the documented MongoDB collections, references, and indexes aligned', () => {
    expect(UserSchema.get('collection')).toBe('users');
    expect(WeatherStationSchema.get('collection')).toBe('weather_stations');
    expect(MeasurementSchema.get('collection')).toBe('measurements');

    expect(UserSchema.path('notificationPreferences.stationId')).toBeDefined();
    expect(UserSchema.path('notificationPreferences.alertTypes')).toBeDefined();
    expect(UserSchema.path('deliveryChannels.telegram.chatId')).toBeDefined();
    expect(WeatherStationSchema.path('ownerId')).toBeDefined();
    expect(MeasurementSchema.path('stationId')).toBeDefined();

    expect(UserSchema.indexes()).toContainEqual([{ email: 1 }, { unique: true }]);
    expect(UserSchema.indexes()).toContainEqual([
      { 'notificationPreferences.stationId': 1 },
      {},
    ]);
    expect(WeatherStationSchema.indexes()).toContainEqual([{ ownerId: 1 }, {}]);
    expect(MeasurementSchema.indexes()).toContainEqual([
      { stationId: 1, reportedAt: -1 },
      {},
    ]);
    expect(MeasurementSchema.indexes()).toContainEqual([{ alertStatus: 1 }, {}]);
  });

  it('preserves the documented split between alert intent and delivery settings', () => {
    const notificationPreferencesPath = UserSchema.path('notificationPreferences');
    const deliveryChannelsPath = UserSchema.path('deliveryChannels');

    expect(notificationPreferencesPath.instance).toBe('Array');
    expect(deliveryChannelsPath.schema?.path('telegram.chatId')).toBeDefined();
  });
});
