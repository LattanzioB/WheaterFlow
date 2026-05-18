import { WeatherStation } from '../../domain/entities/weather-station.entity';
import { Location } from '../../domain/value-objects/location.value-object';
import { StationStatus } from '../../domain/value-objects/station-status.enum';
import { WeatherStationDocumentMapper } from './weather-station-document.mapper';
import { WeatherStationSchema } from '../persistence/weather-station.schema';

describe('WeatherStation persistence mapping', () => {
  it('defines the weather station schema with owner and nested paths', () => {
    expect(WeatherStationSchema.path('ownerId')).toBeDefined();
    expect(WeatherStationSchema.path('location.latitude')).toBeDefined();
    expect(WeatherStationSchema.path('alertSettings.storm')).toBeDefined();

    expect(WeatherStationSchema.indexes()).toContainEqual([{ ownerId: 1 }, {}]);
  });

  it('maps a weather station aggregate to a persistence document', () => {
    const station = WeatherStation.create({
      id: 'station-1',
      name: 'Central',
      location: Location.create(-34.6037, -58.3816),
      sensorModel: 'WH-1080',
      status: StationStatus.INACTIVE,
      ownerId: 'user-1',
      createdAt: new Date('2026-04-25T14:00:00.000Z'),
    });

    station.configureAlerts({
      storm: false,
      frost: true,
      extremeHeat: true,
      criticalHumidity: false,
    });

    expect(WeatherStationDocumentMapper.toPersistence(station)).toEqual({
      _id: 'station-1',
      name: 'Central',
      location: {
        latitude: -34.6037,
        longitude: -58.3816,
      },
      sensorModel: 'WH-1080',
      status: StationStatus.INACTIVE,
      ownerId: 'user-1',
      alertSettings: {
        extremeHeat: true,
        frost: true,
        storm: false,
        criticalHumidity: false,
      },
      createdAt: new Date('2026-04-25T14:00:00.000Z'),
    });
  });

  it('maps a persistence document back to the weather station aggregate', () => {
    const station = WeatherStationDocumentMapper.toDomain({
      _id: 'station-2',
      name: 'North',
      location: {
        latitude: -32.1,
        longitude: -60.3,
      },
      sensorModel: 'Davis',
      status: StationStatus.ACTIVE,
      ownerId: 'user-2',
      alertSettings: {
        extremeHeat: false,
        frost: true,
        storm: true,
        criticalHumidity: true,
      },
      createdAt: new Date('2026-04-25T15:00:00.000Z'),
    });

    expect(station.getId()).toBe('station-2');
    expect(station.getLocation().getLatitude()).toBe(-32.1);
    expect(station.getAlertSettings().toPrimitives()).toEqual({
      extremeHeat: false,
      frost: true,
      storm: true,
      criticalHumidity: true,
    });
    expect(station.getCreatedAt().toISOString()).toBe(
      '2026-04-25T15:00:00.000Z',
    );
  });
});
