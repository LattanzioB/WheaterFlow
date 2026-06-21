import { Measurement } from '../../domain/entities/measurement.entity';
import { Humidity } from '../../domain/value-objects/humidity.value-object';
import { Pressure } from '../../domain/value-objects/pressure.value-object';
import { Temperature } from '../../domain/value-objects/temperature.value-object';
import { MeasurementSource } from '../../domain/value-objects/measurement-source.enum';
import {
  MeasurementModelDocument,
  MeasurementPersistence,
} from '../persistence/measurement.schema';

export class MeasurementDocumentMapper {
  static toPersistence(measurement: Measurement): MeasurementPersistence {
    return {
      _id: measurement.getId(),
      stationId: measurement.getStationId(),
      temperature: measurement.getTemperature().getValue(),
      humidity: measurement.getHumidity().getValue(),
      pressure: measurement.getPressure().getValue(),
      reportedAt: measurement.getReportedAt(),
      source: measurement.getSource(),
      alertStatus: measurement.hasAlert(),
      alertType: measurement.getAlertType(),
    };
  }

  static toDomain(
    document: MeasurementPersistence | MeasurementModelDocument,
  ): Measurement {
    return Measurement.create({
      id: document._id,
      stationId: document.stationId,
      temperature: Temperature.create(document.temperature),
      humidity: Humidity.create(document.humidity),
      pressure: Pressure.create(document.pressure),
      reportedAt: document.reportedAt,
      source: document.source ?? MeasurementSource.MANUAL,
      alertStatus: document.alertStatus,
      alertType: document.alertType,
    });
  }
}
