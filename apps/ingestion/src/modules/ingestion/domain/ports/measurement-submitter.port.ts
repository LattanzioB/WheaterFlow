import type { WeatherDataReading } from './weather-data-provider.port';

export const MEASUREMENT_SUBMITTER_TOKEN = 'MeasurementSubmitter';

export type SubmitMeasurementCommand = {
  stationId: string;
  reading: WeatherDataReading;
  correlationId: string;
};

export type SubmittedMeasurement = {
  id: string;
  stationId: string;
  source: 'openweather';
  reportedAt: string;
  alertStatus: boolean;
  alertType: string;
};

export interface MeasurementSubmitter {
  submitMeasurement(
    command: SubmitMeasurementCommand,
  ): Promise<SubmittedMeasurement>;
}
