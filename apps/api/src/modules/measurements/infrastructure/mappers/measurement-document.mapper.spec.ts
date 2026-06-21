import { Measurement } from '../../domain/entities/measurement.entity';
import { AlertType } from '../../domain/value-objects/alert-type.enum';
import { Humidity } from '../../domain/value-objects/humidity.value-object';
import { Pressure } from '../../domain/value-objects/pressure.value-object';
import { Temperature } from '../../domain/value-objects/temperature.value-object';
import { MeasurementDocumentMapper } from './measurement-document.mapper';
import { MeasurementSchema } from '../persistence/measurement.schema';
import { MeasurementSource } from '../../domain/value-objects/measurement-source.enum';

describe('Measurement persistence mapping', () => {
  it('defines the measurement schema with the expected indexes', () => {
    expect(MeasurementSchema.path('stationId')).toBeDefined();
    expect(MeasurementSchema.path('reportedAt')).toBeDefined();
    expect(MeasurementSchema.path('alertType')).toBeDefined();
    expect(MeasurementSchema.path('source')).toBeDefined();

    expect(MeasurementSchema.indexes()).toContainEqual([
      { stationId: 1, reportedAt: -1 },
      {},
    ]);
    expect(MeasurementSchema.indexes()).toContainEqual([
      { alertStatus: 1 },
      {},
    ]);
  });

  it('maps a measurement aggregate to a persistence document', () => {
    const measurement = Measurement.create({
      id: 'measurement-1',
      stationId: 'station-1',
      temperature: Temperature.create(42.5),
      humidity: Humidity.create(64),
      pressure: Pressure.create(1001),
      reportedAt: new Date('2026-04-25T16:00:00.000Z'),
      alertStatus: true,
      alertType: AlertType.EXTREME_HEAT,
      source: MeasurementSource.OPENWEATHER,
    });

    expect(MeasurementDocumentMapper.toPersistence(measurement)).toEqual({
      _id: 'measurement-1',
      stationId: 'station-1',
      temperature: 42.5,
      humidity: 64,
      pressure: 1001,
      reportedAt: new Date('2026-04-25T16:00:00.000Z'),
      source: MeasurementSource.OPENWEATHER,
      alertStatus: true,
      alertType: AlertType.EXTREME_HEAT,
    });
  });

  it('maps a persistence document back to the measurement aggregate', () => {
    const measurement = MeasurementDocumentMapper.toDomain({
      _id: 'measurement-2',
      stationId: 'station-3',
      temperature: 10,
      humidity: 75,
      pressure: 1008,
      reportedAt: new Date('2026-04-25T17:00:00.000Z'),
      alertStatus: false,
      alertType: AlertType.NONE,
    });

    expect(measurement.getId()).toBe('measurement-2');
    expect(measurement.getStationId()).toBe('station-3');
    expect(measurement.getTemperature().getValue()).toBe(10);
    expect(measurement.hasAlert()).toBe(false);
    expect(measurement.getAlertType()).toBe(AlertType.NONE);
    expect(measurement.getSource()).toBe(MeasurementSource.MANUAL);
  });
});
