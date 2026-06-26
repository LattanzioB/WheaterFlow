import { createHash } from 'node:crypto';
import type { AxiosInstance } from 'axios';
import { ApiMeasurementSubmitterAdapter } from './api-measurement-submitter.adapter';

describe('ApiMeasurementSubmitterAdapter', () => {
  it('submits an OpenWeather reading with deterministic idempotency and correlation', async () => {
    const httpClient = {
      post: jest.fn().mockResolvedValue({
        data: {
          id: 'measurement-1',
          stationId: 'station-1',
          source: 'openweather',
          reportedAt: '2026-06-25T12:00:00.000Z',
          alertStatus: true,
          alertType: 'Calor Extremo',
        },
      }),
    } as unknown as AxiosInstance;
    const adapter = new ApiMeasurementSubmitterAdapter(httpClient);
    const observedAt = new Date('2026-06-25T12:00:00.000Z');

    await expect(
      adapter.submitMeasurement({
        stationId: 'station-1',
        correlationId: 'cycle-1',
        reading: {
          externalId: 'owm-3435910',
          temperature: { value: 41, unit: 'celsius' },
          humidity: { value: 65, unit: 'percent' },
          pressure: { value: 1005, unit: 'hPa' },
          observedAt,
        },
      }),
    ).resolves.toMatchObject({
      id: 'measurement-1',
      source: 'openweather',
      alertStatus: true,
    });

    const idempotencyKey = createHash('sha256')
      .update('openweather:station-1:owm-3435910:2026-06-25T12:00:00.000Z')
      .digest('hex');
    expect(httpClient.post).toHaveBeenCalledWith(
      '/internal/ingestion/measurements',
      {
        stationId: 'station-1',
        temperature: 41,
        humidity: 65,
        pressure: 1005,
        reportedAt: '2026-06-25T12:00:00.000Z',
        source: 'openweather',
        idempotencyKey,
      },
      {
        headers: {
          'x-correlation-id': 'cycle-1',
        },
      },
    );
  });

  it('rejects malformed API measurement responses', async () => {
    const httpClient = {
      post: jest.fn().mockResolvedValue({ data: { source: 'manual' } }),
    } as unknown as AxiosInstance;
    const adapter = new ApiMeasurementSubmitterAdapter(httpClient);

    await expect(
      adapter.submitMeasurement({
        stationId: 'station-1',
        correlationId: 'cycle-1',
        reading: {
          externalId: 'owm-1',
          temperature: { value: 20, unit: 'celsius' },
          humidity: { value: 60, unit: 'percent' },
          pressure: { value: 1010, unit: 'hPa' },
          observedAt: new Date(),
        },
      }),
    ).rejects.toThrow('invalid measurement');
  });
});
