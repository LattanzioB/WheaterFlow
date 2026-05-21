import { IMeasurementRepository } from '../../domain/ports/measurement-repository.port';
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
      findLatestByStationIds: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      findWithFilters: jest.fn(),
    });

  const sampleMeasurements = [
    Measurement.create({
      id: 'measurement-1',
      stationId: 'station-1',
      temperature: Temperature.create(25),
      humidity: Humidity.create(60),
      pressure: Pressure.create(1000),
    }),
  ];

  it('normalizes filters before querying the repository', async () => {
    const measurementRepository = buildMeasurementRepository();
    const service = new QueryMeasurementsService(measurementRepository);
    const command: QueryMeasurementsCommand = {
      stationName: ' Central ',
      tempMin: 10,
      tempMax: 30,
      humidityMin: 40,
      humidityMax: 80,
      pressureMin: 990,
      pressureMax: 1020,
      reportedFrom: '2026-04-01T00:00:00.000Z',
      reportedTo: '2026-04-30T23:59:59.999Z',
      alertOnly: true,
    };

    measurementRepository.findWithFilters.mockResolvedValue(sampleMeasurements);

    const result = await service.execute(command);

    expect(measurementRepository.findWithFilters.mock.calls).toEqual([
      [
        {
          stationName: 'Central',
          tempMin: 10,
          tempMax: 30,
          humidityMin: 40,
          humidityMax: 80,
          pressureMin: 990,
          pressureMax: 1020,
          reportedFrom: new Date('2026-04-01T00:00:00.000Z'),
          reportedTo: new Date('2026-04-30T23:59:59.999Z'),
          alertOnly: true,
        },
      ],
    ]);
    expect(result).toEqual(sampleMeasurements);
  });

  it.each([
    [
      { tempMin: 30, tempMax: 10 },
      'Minimum temperature cannot be greater than maximum temperature',
    ],
    [
      { humidityMin: 95, humidityMax: 50 },
      'Minimum humidity cannot be greater than maximum humidity',
    ],
    [
      { pressureMin: 1030, pressureMax: 980 },
      'Minimum pressure cannot be greater than maximum pressure',
    ],
    [
      {
        reportedFrom: '2026-04-30T00:00:00.000Z',
        reportedTo: '2026-04-01T00:00:00.000Z',
      },
      'reportedFrom cannot be later than reportedTo',
    ],
  ])(
    'rejects invalid ranges before querying (%j)',
    async (command, message) => {
      const measurementRepository = buildMeasurementRepository();
      const service = new QueryMeasurementsService(measurementRepository);

      await expect(service.execute(command)).rejects.toThrow(message);
      expect(measurementRepository.findWithFilters.mock.calls).toHaveLength(0);
    },
  );
});
