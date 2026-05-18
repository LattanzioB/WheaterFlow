import { WeatherStation } from './weather-station.entity';
import { Location } from '../value-objects/location.value-object';
import { StationAlertSettings } from '../value-objects/station-alert-settings.value-object';
import { StationStatus } from '../value-objects/station-status.enum';

describe('WeatherStation', () => {
  const location = Location.create(-34.6037, -58.3816);

  const buildStation = () =>
    WeatherStation.create({
      name: ' Estacion Central ',
      location,
      sensorModel: ' WH-1080 ',
      ownerId: ' owner-1 ',
    });

  it('creates an active station with normalized text and enabled alerts', () => {
    const station = buildStation();

    expect(station.getId()).toBeTruthy();
    expect(station.getName()).toBe('Estacion Central');
    expect(station.getSensorModel()).toBe('WH-1080');
    expect(station.getOwnerId()).toBe('owner-1');
    expect(station.getStatus()).toBe(StationStatus.ACTIVE);
    expect(station.getAlertSettings().toPrimitives()).toEqual({
      extremeHeat: true,
      frost: true,
      storm: true,
      criticalHumidity: true,
    });
  });

  it('accepts custom status and alert settings', () => {
    const station = WeatherStation.create({
      id: 'station-1',
      name: 'North',
      location,
      sensorModel: 'AWS-2000',
      ownerId: 'owner-1',
      status: StationStatus.INACTIVE,
      alertSettings: StationAlertSettings.create({
        extremeHeat: false,
        criticalHumidity: false,
      }),
      createdAt: new Date('2026-04-25T12:00:00.000Z'),
    });

    expect(station.getStatus()).toBe(StationStatus.INACTIVE);
    expect(station.getAlertSettings().toPrimitives()).toEqual({
      extremeHeat: false,
      frost: true,
      storm: true,
      criticalHumidity: false,
    });
    expect(station.getCreatedAt().toISOString()).toBe(
      '2026-04-25T12:00:00.000Z',
    );
  });

  it('updates mutable station attributes', () => {
    const station = buildStation();

    station.rename('South');
    station.relocate(Location.create(-33.0, -57.0));
    station.changeSensorModel('AWS-3000');
    station.reassignOwner('owner-2');
    station.configureAlerts({
      extremeHeat: false,
      storm: false,
    });
    station.deactivate();

    expect(station.getName()).toBe('South');
    expect(station.getLocation().equals(Location.create(-33.0, -57.0))).toBe(
      true,
    );
    expect(station.getSensorModel()).toBe('AWS-3000');
    expect(station.getOwnerId()).toBe('owner-2');
    expect(station.getAlertSettings().toPrimitives()).toEqual({
      extremeHeat: false,
      frost: true,
      storm: false,
      criticalHumidity: true,
    });
    expect(station.getStatus()).toBe(StationStatus.INACTIVE);

    station.activate();

    expect(station.getStatus()).toBe(StationStatus.ACTIVE);
  });

  it('rejects blank required text fields', () => {
    expect(() =>
      WeatherStation.create({
        name: ' ',
        location,
        sensorModel: 'WH-1080',
        ownerId: 'owner-1',
      }),
    ).toThrow('Station name cannot be empty');

    expect(() =>
      WeatherStation.create({
        name: 'Central',
        location,
        sensorModel: ' ',
        ownerId: 'owner-1',
      }),
    ).toThrow('Sensor model cannot be empty');

    expect(() =>
      WeatherStation.create({
        name: 'Central',
        location,
        sensorModel: 'WH-1080',
        ownerId: ' ',
      }),
    ).toThrow('Owner id cannot be empty');
  });
});
