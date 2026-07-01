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

export interface TemperatureAveragePeriod {
  stationId: string;
  from: Date;
  to: Date;
}

export interface TemperatureAverageResult {
  average: number | null;
  sampleCount: number;
}

export interface IMeasurementRepository {
  findById(id: string): Promise<Measurement | null>;
  findByStationId(stationId: string): Promise<Measurement[]>;
  findLatestByStationIds(stationIds: string[]): Promise<Measurement[]>;
  averageTemperatureForPeriod(
    period: TemperatureAveragePeriod,
  ): Promise<TemperatureAverageResult>;
  save(measurement: Measurement): Promise<void>;
  saveIfAbsent(measurement: Measurement): Promise<boolean>;
  delete(id: string): Promise<void>;
  findWithFilters(filters: MeasurementFilters): Promise<Measurement[]>;
}
