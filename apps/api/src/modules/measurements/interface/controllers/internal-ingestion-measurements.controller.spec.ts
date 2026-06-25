import { UnauthorizedException } from '@nestjs/common';
import { MeasurementSource } from '../../domain/value-objects/measurement-source.enum';
import { InternalIngestionMeasurementsController } from './internal-ingestion-measurements.controller';

describe('InternalIngestionMeasurementsController', () => {
  it('routes authenticated ingestion payloads through RecordMeasurementService', async () => {
    const measurement = {
      getId: () => 'measurement-1',
      getStationId: () => 'station-1',
      getTemperature: () => ({ getValue: () => 41 }),
      getHumidity: () => ({ getValue: () => 65 }),
      getPressure: () => ({ getValue: () => 1005 }),
      getReportedAt: () => new Date('2026-06-25T12:00:00.000Z'),
      getSource: () => MeasurementSource.OPENWEATHER,
      hasAlert: () => true,
      getAlertType: () => 'Calor Extremo',
    };
    const recordMeasurementService = {
      execute: jest.fn().mockResolvedValue(measurement),
    };
    const controller = new InternalIngestionMeasurementsController(
      recordMeasurementService as never,
    );

    await expect(
      controller.create(
        {
          stationId: 'station-1',
          temperature: 41,
          humidity: 65,
          pressure: 1005,
          reportedAt: '2026-06-25T12:00:00.000Z',
          source: MeasurementSource.OPENWEATHER,
          idempotencyKey: 'a'.repeat(64),
        },
        'cycle-1',
      ),
    ).resolves.toMatchObject({
      id: 'measurement-1',
      source: MeasurementSource.OPENWEATHER,
      alertStatus: true,
    });
    expect(recordMeasurementService.execute).toHaveBeenCalledWith({
      stationId: 'station-1',
      temperature: 41,
      humidity: 65,
      pressure: 1005,
      reportedAt: new Date('2026-06-25T12:00:00.000Z'),
      source: MeasurementSource.OPENWEATHER,
      idempotencyKey: 'a'.repeat(64),
      correlationId: 'cycle-1',
    });
  });

  it('requires a correlation identifier', async () => {
    const controller = new InternalIngestionMeasurementsController({
      execute: jest.fn(),
    } as never);

    await expect(
      controller.create(
        {
          stationId: 'station-1',
          temperature: 20,
          humidity: 60,
          pressure: 1010,
          reportedAt: '2026-06-25T12:00:00.000Z',
          source: MeasurementSource.OPENWEATHER,
          idempotencyKey: 'a'.repeat(64),
        },
        undefined,
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
