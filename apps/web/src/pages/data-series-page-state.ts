import type { Measurement } from '../api/types';

export type MetricKey = 'temperature' | 'humidity' | 'pressure';

export const METRIC_LABELS: Record<MetricKey, string> = {
  temperature: 'Temperatura (°C)',
  humidity: 'Humedad (%)',
  pressure: 'Presión (hPa)',
};

export const METRIC_KEYS: MetricKey[] = [
  'temperature',
  'humidity',
  'pressure',
];

export interface SeriesPoint {
  timestamp: number;
  temperature: number;
  humidity: number;
  pressure: number;
}

export function buildSeriesPoints(measurements: Measurement[]): SeriesPoint[] {
  return [...measurements]
    .sort(
      (a, b) =>
        new Date(a.reportedAt).getTime() - new Date(b.reportedAt).getTime(),
    )
    .map((measurement) => ({
      timestamp: new Date(measurement.reportedAt).getTime(),
      temperature: measurement.temperature,
      humidity: measurement.humidity,
      pressure: measurement.pressure,
    }));
}

export function toggleMetric(
  selected: MetricKey[],
  metric: MetricKey,
): MetricKey[] {
  if (selected.includes(metric)) {
    if (selected.length === 1) {
      return selected;
    }

    return selected.filter((key) => key !== metric);
  }

  return [...selected, metric];
}
