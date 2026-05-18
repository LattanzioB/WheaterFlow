import { Measurement } from '../entities/measurement.entity';
import { AlertType } from '../value-objects/alert-type.enum';
import { Humidity } from '../value-objects/humidity.value-object';
import { Pressure } from '../value-objects/pressure.value-object';
import { Temperature } from '../value-objects/temperature.value-object';
import { AlertEvaluator } from './alert-evaluator.service';

describe('AlertEvaluator', () => {
  const evaluator = new AlertEvaluator();

  it('detects extreme heat above forty degrees', () => {
    const measurement = createMeasurement({
      temperature: Temperature.create(41),
    });

    expect(evaluator.evaluate(measurement)).toBe(AlertType.EXTREME_HEAT);
  });

  it('detects frost below zero', () => {
    const measurement = createMeasurement({
      temperature: Temperature.create(-1),
    });

    expect(evaluator.evaluate(measurement)).toBe(AlertType.FROST);
  });

  it('detects storm pressure below nine hundred eighty hpa', () => {
    const measurement = createMeasurement({
      pressure: Pressure.create(970),
    });

    expect(evaluator.evaluate(measurement)).toBe(AlertType.STORM);
  });

  it('detects critical humidity above ninety percent', () => {
    const measurement = createMeasurement({
      humidity: Humidity.create(95),
    });

    expect(evaluator.evaluate(measurement)).toBe(AlertType.CRITICAL_HUMIDITY);
  });

  it('preserves rule priority when multiple thresholds are breached', () => {
    const measurement = createMeasurement({
      pressure: Pressure.create(970),
      humidity: Humidity.create(95),
    });

    expect(evaluator.evaluate(measurement)).toBe(AlertType.STORM);
  });

  it('returns none when the matching rule is disabled for the station', () => {
    const measurement = createMeasurement({
      temperature: Temperature.create(41),
    });

    const result = evaluator.evaluate(measurement, {
      extremeHeat: false,
    });

    expect(result).toBe(AlertType.NONE);
  });
});

function createMeasurement(overrides?: {
  temperature?: Temperature;
  humidity?: Humidity;
  pressure?: Pressure;
}): Measurement {
  return Measurement.create({
    stationId: 'station-1',
    temperature: overrides?.temperature ?? Temperature.create(24),
    humidity: overrides?.humidity ?? Humidity.create(55),
    pressure: overrides?.pressure ?? Pressure.create(1005),
    alertStatus: false,
    alertType: AlertType.NONE,
  });
}
