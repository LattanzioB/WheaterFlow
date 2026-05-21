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
      humidityMin: '40',
      humidityMax: '90',
      pressureMin: '980',
      pressureMax: '1020',
      reportedFrom: '2026-04-01T00:00:00.000Z',
      reportedTo: '2026-04-30T23:59:59.999Z',
      alertOnly: 'true',
    });

    await expect(validate(dto)).resolves.toEqual([]);
    expect(dto.tempMin).toBe(10);
    expect(dto.tempMax).toBe(30);
    expect(dto.humidityMin).toBe(40);
    expect(dto.humidityMax).toBe(90);
    expect(dto.pressureMin).toBe(980);
    expect(dto.pressureMax).toBe(1020);
    expect(dto.reportedFrom).toBe('2026-04-01T00:00:00.000Z');
    expect(dto.reportedTo).toBe('2026-04-30T23:59:59.999Z');
    expect(dto.alertOnly).toBe(true);
  });
});
