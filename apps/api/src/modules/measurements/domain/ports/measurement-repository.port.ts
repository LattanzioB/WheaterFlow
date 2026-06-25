import { Measurement } from '../entities/measurement.entity';

export interface MeasurementFilters {
  stationName?: string;
  tempMin?: number;
  tempMax?: number;
  humidityMin?: number;
  humidityMax?: number;
  pressureMin?: number;
  pressureMax?: number;
  reportedFrom?: Date;
  reportedTo?: Date;
  alertOnly?: boolean;
}

export interface IMeasurementRepository {
  findById(id: string): Promise<Measurement | null>;
  findByStationId(stationId: string): Promise<Measurement[]>;
  findLatestByStationIds(stationIds: string[]): Promise<Measurement[]>;
  save(measurement: Measurement): Promise<void>;
  saveIfAbsent(measurement: Measurement): Promise<boolean>;
  delete(id: string): Promise<void>;
  findWithFilters(filters: MeasurementFilters): Promise<Measurement[]>;
}
