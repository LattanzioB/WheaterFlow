import { Measurement } from './measurement.entity';
import { AlertType } from '../value-objects/alert-type.enum';
import { Humidity } from '../value-objects/humidity.value-object';
import { Pressure } from '../value-objects/pressure.value-object';
import { Temperature } from '../value-objects/temperature.value-object';

describe('Measurement', () => {
  const buildMeasurement = () =>
    Measurement.create({
      stationId: ' station-1 ',
      temperature: Temperature.create(24),
      humidity: Humidity.create(55),
      pressure: Pressure.create(1005),
    });

  it('creates a measurement without alerts by default', () => {
    const measurement = buildMeasurement();

    expect(measurement.getId()).toBeTruthy();
    expect(measurement.getStationId()).toBe('station-1');
    expect(measurement.hasAlert()).toBe(false);
    expect(measurement.getAlertType()).toBe(AlertType.NONE);
  });

  it('accepts reconstituted alert state when it is consistent', () => {
    const measurement = Measurement.create({
      id: 'measurement-1',
      stationId: 'station-1',
      temperature: Temperature.create(41),
      humidity: Humidity.create(60),
      pressure: Pressure.create(1000),
      reportedAt: new Date('2026-04-25T13:00:00.000Z'),
      alertStatus: true,
      alertType: AlertType.EXTREME_HEAT,
    });

    expect(measurement.getId()).toBe('measurement-1');
    expect(measurement.getReportedAt().toISOString()).toBe(
      '2026-04-25T13:00:00.000Z',
    );
    expect(measurement.hasAlert()).toBe(true);
    expect(measurement.getAlertType()).toBe(AlertType.EXTREME_HEAT);
  });

  it('updates alert state through applyAlert and clearAlert', () => {
    const measurement = buildMeasurement();

    measurement.applyAlert(AlertType.STORM);

    expect(measurement.hasAlert()).toBe(true);
    expect(measurement.getAlertType()).toBe(AlertType.STORM);

    measurement.applyAlert(AlertType.NONE);

    expect(measurement.hasAlert()).toBe(false);
    expect(measurement.getAlertType()).toBe(AlertType.NONE);
  });

  it('rejects blank identifiers and invalid timestamps', () => {
    expect(() =>
      Measurement.create({
        stationId: ' ',
        temperature: Temperature.create(24),
        humidity: Humidity.create(55),
        pressure: Pressure.create(1005),
      }),
    ).toThrow('Station id cannot be empty');

    expect(() =>
      Measurement.create({
        stationId: 'station-1',
        temperature: Temperature.create(24),
        humidity: Humidity.create(55),
        pressure: Pressure.create(1005),
        reportedAt: new Date('invalid'),
      }),
    ).toThrow('Reported at must be a valid date');
  });

  it('rejects inconsistent persisted alert state', () => {
    expect(() =>
      Measurement.create({
        stationId: 'station-1',
        temperature: Temperature.create(41),
        humidity: Humidity.create(60),
        pressure: Pressure.create(1000),
        alertStatus: false,
        alertType: AlertType.EXTREME_HEAT,
      }),
    ).toThrow('Alert type must be NONE when alert status is false');
  });
});
