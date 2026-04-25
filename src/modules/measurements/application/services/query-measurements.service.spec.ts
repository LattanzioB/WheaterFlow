import { IMeasurementRepository } from '../ports/measurement-repository.port';
import {
  QueryMeasurementsCommand,
  QueryMeasurementsService,
} from './query-measurements.service';
import { Measurement } from '../../domain/entities/measurement.entity';
import { Temperature } from '../../domain/value-objects/temperature.value-object';
import { Humidity } from '../../domain/value-objects/humidity.value-object';
import { Pressure } from '../../domain/value-objects/pressure.value-object';

describe('QueryMeasurementsService', () => {
  const buildMeasurementRepository =
    (): jest.Mocked<IMeasurementRepository> => ({
      findById: jest.fn(),
      findByStationId: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      findWithFilters: jest.fn(),
    });

  it('normalizes filters before querying the repository', async () => {
    const measurementRepository = buildMeasurementRepository();
    const service = new QueryMeasurementsService(measurementRepository);
    const command: QueryMeasurementsCommand = {
      stationName: ' Central ',
      tempMin: 10,
      tempMax: 30,
      alertOnly: true,
    };
    const measurements = [
      Measurement.create({
        id: 'measurement-1',
        stationId: 'station-1',
        temperature: Temperature.create(25),
        humidity: Humidity.create(60),
        pressure: Pressure.create(1000),
      }),
    ];

    measurementRepository.findWithFilters.mockResolvedValue(measurements);

    const result = await service.execute(command);

    expect(measurementRepository.findWithFilters.mock.calls).toEqual([
      [
        {
          stationName: 'Central',
          tempMin: 10,
          tempMax: 30,
          alertOnly: true,
        },
      ],
    ]);
    expect(result).toEqual(measurements);
  });

  it('rejects invalid temperature ranges before querying', async () => {
    const measurementRepository = buildMeasurementRepository();
    const service = new QueryMeasurementsService(measurementRepository);

    await expect(
      service.execute({
        tempMin: 30,
        tempMax: 10,
      }),
    ).rejects.toThrow(
      'Minimum temperature cannot be greater than maximum temperature',
    );
    expect(measurementRepository.findWithFilters.mock.calls).toHaveLength(0);
  });
});
