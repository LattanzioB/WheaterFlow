import type { Measurement } from '../api/types';
import { buildSeriesPoints, toggleMetric } from './data-series-page-state';

function measurement(overrides: Partial<Measurement> = {}): Measurement {
  return {
    id: 'measurement-1',
    stationId: 'station-1',
    temperature: 22,
    humidity: 55,
    pressure: 1013,
    reportedAt: '2026-05-01T10:00:00.000Z',
    source: 'openweather',
    alertStatus: false,
    alertType: 'NONE',
    ...overrides,
  };
}

describe('data series page state', () => {
  it('builds chart points sorted by reported date ascending', () => {
    const points = buildSeriesPoints([
      measurement({
        id: 'newest',
        reportedAt: '2026-05-01T12:00:00.000Z',
        temperature: 25,
      }),
      measurement({
        id: 'oldest',
        reportedAt: '2026-05-01T08:00:00.000Z',
        temperature: 18,
      }),
      measurement({
        id: 'middle',
        reportedAt: '2026-05-01T10:00:00.000Z',
        temperature: 21,
      }),
    ]);

    expect(points.map((point) => point.temperature)).toEqual([18, 21, 25]);
    expect(points[0]).toEqual({
      timestamp: new Date('2026-05-01T08:00:00.000Z').getTime(),
      temperature: 18,
      humidity: 55,
      pressure: 1013,
    });
  });

  it('returns an empty series when there are no measurements', () => {
    expect(buildSeriesPoints([])).toEqual([]);
  });

  it('toggles metrics while preserving the rest of the selection', () => {
    expect(toggleMetric(['temperature'], 'humidity')).toEqual([
      'temperature',
      'humidity',
    ]);
    expect(toggleMetric(['temperature', 'humidity'], 'temperature')).toEqual([
      'humidity',
    ]);
  });

  it('keeps at least one metric visible', () => {
    expect(toggleMetric(['pressure'], 'pressure')).toEqual(['pressure']);
  });
});
