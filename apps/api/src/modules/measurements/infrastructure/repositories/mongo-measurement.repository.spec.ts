import { AlertType } from '../../domain/value-objects/alert-type.enum';
import { MeasurementSource } from '../../domain/value-objects/measurement-source.enum';
import { MongoMeasurementRepository } from './mongo-measurement.repository';

describe('MongoMeasurementRepository', () => {
  const buildQuery = <T>(result: T) => ({
    lean: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue(result),
  });

  const buildModel = () =>
    ({
      findById: jest.fn(),
      replaceOne: jest.fn(),
      updateOne: jest.fn(),
      deleteOne: jest.fn(),
      find: jest.fn(),
      aggregate: jest.fn(),
    }) as any;

  const measurementDocument = {
    _id: 'measurement-1',
    stationId: 'station-1',
    temperature: 42.5,
    humidity: 64,
    pressure: 1001,
    reportedAt: new Date('2026-04-25T22:00:00.000Z'),
    alertStatus: true,
    alertType: AlertType.EXTREME_HEAT,
  };

  it('builds preference-aware filters including station name resolution', async () => {
    const measurementModel = buildModel();
    const stationModel = buildModel();
    const stationQuery = buildQuery([{ _id: 'station-1' }]);
    const measurementQuery = buildQuery([measurementDocument]);
    const repository = new MongoMeasurementRepository(
      measurementModel,
      stationModel,
    );

    stationModel.find.mockReturnValue(stationQuery);
    measurementModel.find.mockReturnValue(measurementQuery);

    const measurements = await repository.findWithFilters({
      stationName: 'Central',
      tempMin: 40,
      tempMax: 45,
      alertOnly: true,
    });

    expect(stationModel.find).toHaveBeenCalledWith(
      {
        name: {
          $regex: 'Central',
          $options: 'i',
        },
      },
      { _id: 1 },
    );
    expect(measurementModel.find).toHaveBeenCalledWith({
      stationId: { $in: ['station-1'] },
      temperature: { $gte: 40, $lte: 45 },
      alertStatus: true,
    });
    expect(measurements).toHaveLength(1);
    expect(measurements[0].getAlertType()).toBe(AlertType.EXTREME_HEAT);
  });

  it('returns an empty result when the station name filter matches nothing', async () => {
    const measurementModel = buildModel();
    const stationModel = buildModel();
    const stationQuery = buildQuery([]);
    const repository = new MongoMeasurementRepository(
      measurementModel,
      stationModel,
    );

    stationModel.find.mockReturnValue(stationQuery);

    const measurements = await repository.findWithFilters({
      stationName: 'Unknown',
    });

    expect(measurements).toEqual([]);
    expect(measurementModel.find).not.toHaveBeenCalled();
  });

  it('upserts measurements when saving', async () => {
    const measurementModel = buildModel();
    const stationModel = buildModel();
    const repository = new MongoMeasurementRepository(
      measurementModel,
      stationModel,
    );
    const aggregate = {
      getId: () => 'measurement-2',
      getStationId: () => 'station-2',
      getTemperature: () => ({ getValue: () => 10 }),
      getHumidity: () => ({ getValue: () => 75 }),
      getPressure: () => ({ getValue: () => 1008 }),
      getReportedAt: () => new Date('2026-04-25T23:00:00.000Z'),
      getSource: () => MeasurementSource.MANUAL,
      hasAlert: () => false,
      getAlertType: () => AlertType.NONE,
    } as any;

    measurementModel.replaceOne.mockResolvedValue({ acknowledged: true });

    await repository.save(aggregate);

    expect(measurementModel.replaceOne).toHaveBeenCalledWith(
      { _id: 'measurement-2' },
      {
        _id: 'measurement-2',
        stationId: 'station-2',
        temperature: 10,
        humidity: 75,
        pressure: 1008,
        reportedAt: new Date('2026-04-25T23:00:00.000Z'),
        source: MeasurementSource.MANUAL,
        alertStatus: false,
        alertType: AlertType.NONE,
      },
      { upsert: true },
    );
  });

  it('queries the latest measurement per station', async () => {
    const measurementModel = buildModel();
    const stationModel = buildModel();
    const aggregateQuery = {
      exec: jest.fn().mockResolvedValue([measurementDocument]),
    };
    const repository = new MongoMeasurementRepository(
      measurementModel,
      stationModel,
    );

    measurementModel.aggregate.mockReturnValue(aggregateQuery);

    const measurements = await repository.findLatestByStationIds([
      'station-1',
      'station-2',
    ]);

    expect(measurementModel.aggregate).toHaveBeenCalledWith([
      {
        $match: {
          stationId: {
            $in: ['station-1', 'station-2'],
          },
        },
      },
      {
        $sort: {
          stationId: 1,
          reportedAt: -1,
          _id: -1,
        },
      },
      {
        $group: {
          _id: '$stationId',
          latestMeasurement: {
            $first: '$$ROOT',
          },
        },
      },
      {
        $replaceRoot: {
          newRoot: '$latestMeasurement',
        },
      },
    ]);
    expect(measurements).toHaveLength(1);
    expect(measurements[0].getStationId()).toBe('station-1');
  });

  it('atomically inserts an idempotent measurement only once', async () => {
    const measurementModel = buildModel();
    const stationModel = buildModel();
    const repository = new MongoMeasurementRepository(
      measurementModel,
      stationModel,
    );
    const aggregate = {
      getId: () => 'ingestion-key',
      getStationId: () => 'station-2',
      getTemperature: () => ({ getValue: () => 10 }),
      getHumidity: () => ({ getValue: () => 75 }),
      getPressure: () => ({ getValue: () => 1008 }),
      getReportedAt: () => new Date('2026-04-25T23:00:00.000Z'),
      getSource: () => MeasurementSource.OPENWEATHER,
      hasAlert: () => false,
      getAlertType: () => AlertType.NONE,
    } as any;

    measurementModel.updateOne.mockResolvedValue({ upsertedCount: 1 });

    await expect(repository.saveIfAbsent(aggregate)).resolves.toBe(true);
    expect(measurementModel.updateOne).toHaveBeenCalledWith(
      { _id: 'ingestion-key' },
      {
        $setOnInsert: expect.objectContaining({
          _id: 'ingestion-key',
          stationId: 'station-2',
          source: MeasurementSource.OPENWEATHER,
        }),
      },
      { upsert: true },
    );
  });

  it('builds date, humidity, and pressure filters in the measurement query', async () => {
    const measurementModel = buildModel();
    const stationModel = buildModel();
    const measurementQuery = buildQuery([measurementDocument]);
    const repository = new MongoMeasurementRepository(
      measurementModel,
      stationModel,
    );

    measurementModel.find.mockReturnValue(measurementQuery);

    await repository.findWithFilters({
      humidityMin: 50,
      humidityMax: 95,
      pressureMin: 980,
      pressureMax: 1015,
      reportedFrom: new Date('2026-04-01T00:00:00.000Z'),
      reportedTo: new Date('2026-04-30T23:59:59.999Z'),
    });

    expect(measurementModel.find).toHaveBeenCalledWith({
      humidity: { $gte: 50, $lte: 95 },
      pressure: { $gte: 980, $lte: 1015 },
      reportedAt: {
        $gte: new Date('2026-04-01T00:00:00.000Z'),
        $lte: new Date('2026-04-30T23:59:59.999Z'),
      },
    });
  });
});
