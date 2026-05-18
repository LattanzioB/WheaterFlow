import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateMeasurementDto, QueryMeasurementsDto } from './measurement.dto';

describe('measurement DTOs', () => {
  it('accepts a valid measurement creation payload', async () => {
    const dto = plainToInstance(CreateMeasurementDto, {
      stationId: 'station-1',
      temperature: 42.5,
      humidity: 65,
      pressure: 1008,
      reportedAt: '2026-04-25T12:00:00.000Z',
    });

    await expect(validate(dto)).resolves.toEqual([]);
  });

  it('rejects invalid measurement payloads', async () => {
    const dto = plainToInstance(CreateMeasurementDto, {
      stationId: '',
      temperature: 'hot',
      humidity: 'wet',
      pressure: 'high',
      reportedAt: 'invalid-date',
    });

    const errors = await validate(dto);

    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining([
        'stationId',
        'temperature',
        'humidity',
        'pressure',
        'reportedAt',
      ]),
    );
  });

  it('transforms query params into measurement filter types', async () => {
    const dto = plainToInstance(QueryMeasurementsDto, {
      stationName: 'Central',
      tempMin: '10',
      tempMax: '30',
      alertOnly: 'true',
    });

    await expect(validate(dto)).resolves.toEqual([]);
    expect(dto.tempMin).toBe(10);
    expect(dto.tempMax).toBe(30);
    expect(dto.alertOnly).toBe(true);
  });
});
