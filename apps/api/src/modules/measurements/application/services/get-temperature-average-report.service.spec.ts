import { GetStationByIdService } from '../../../stations/application/services/get-station-by-id.service';
import { IMeasurementRepository } from '../../domain/ports/measurement-repository.port';
import { GetTemperatureAverageReportService } from './get-temperature-average-report.service';

describe('GetTemperatureAverageReportService', () => {
  const buildStationService = () =>
    ({
      execute: jest.fn().mockResolvedValue({
        getId: () => 'station-1',
        getName: () => 'Buenos Aires',
      }),
    }) as unknown as jest.Mocked<GetStationByIdService>;

  const buildMeasurementRepository =
    (): jest.Mocked<IMeasurementRepository> =>
      ({
        findById: jest.fn(),
        findByStationId: jest.fn(),
        findLatestByStationIds: jest.fn(),
        averageTemperatureForPeriod: jest.fn(),
        save: jest.fn(),
        saveIfAbsent: jest.fn(),
        delete: jest.fn(),
        findWithFilters: jest.fn(),
      });

  it('calculates a mobile 24 hour average for an existing station', async () => {
    const stationService = buildStationService();
    const measurementRepository = buildMeasurementRepository();
    const service = new GetTemperatureAverageReportService(
      stationService,
      measurementRepository,
    );
    measurementRepository.averageTemperatureForPeriod.mockResolvedValue({
      average: 18.75,
      sampleCount: 2,
    });

    await expect(
      service.execute({
        stationId: 'station-1',
        window: 'daily',
        now: new Date('2026-06-30T12:00:00.000Z'),
      }),
    ).resolves.toEqual({
      station: { id: 'station-1', name: 'Buenos Aires' },
      period: {
        from: '2026-06-29T12:00:00.000Z',
        to: '2026-06-30T12:00:00.000Z',
      },
      average: { value: 18.75, unit: 'celsius' },
      sampleCount: 2,
    });
    expect(measurementRepository.averageTemperatureForPeriod).toHaveBeenCalledWith({
      stationId: 'station-1',
      from: new Date('2026-06-29T12:00:00.000Z'),
      to: new Date('2026-06-30T12:00:00.000Z'),
    });
  });

  it('calculates a mobile 7 day average', async () => {
    const measurementRepository = buildMeasurementRepository();
    const service = new GetTemperatureAverageReportService(
      buildStationService(),
      measurementRepository,
    );
    measurementRepository.averageTemperatureForPeriod.mockResolvedValue({
      average: 12,
      sampleCount: 1,
    });

    await service.execute({
      stationId: 'station-1',
      window: 'weekly',
      now: new Date('2026-06-30T12:00:00.000Z'),
    });

    expect(measurementRepository.averageTemperatureForPeriod).toHaveBeenCalledWith(
      expect.objectContaining({
        from: new Date('2026-06-23T12:00:00.000Z'),
        to: new Date('2026-06-30T12:00:00.000Z'),
      }),
    );
  });

  it('returns a documented empty-period response when there are no samples', async () => {
    const measurementRepository = buildMeasurementRepository();
    const service = new GetTemperatureAverageReportService(
      buildStationService(),
      measurementRepository,
    );
    measurementRepository.averageTemperatureForPeriod.mockResolvedValue({
      average: null,
      sampleCount: 0,
    });

    await expect(
      service.execute({
        stationId: 'station-1',
        window: 'daily',
        now: new Date('2026-06-30T12:00:00.000Z'),
      }),
    ).resolves.toMatchObject({
      average: { value: null, unit: 'celsius' },
      sampleCount: 0,
    });
  });
});
