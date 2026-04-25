import { StationStatus } from '../../domain/value-objects/station-status.enum';
import { MongoWeatherStationRepository } from './mongo-weather-station.repository';

describe('MongoWeatherStationRepository', () => {
  const buildQuery = <T>(result: T) => ({
    lean: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue(result),
  });

  const buildModel = () =>
    ({
      findById: jest.fn(),
      replaceOne: jest.fn(),
      deleteOne: jest.fn(),
      find: jest.fn(),
    }) as any;

  const stationDocument = {
    _id: 'station-1',
    name: 'Central',
    location: {
      latitude: -34.6037,
      longitude: -58.3816,
    },
    sensorModel: 'WH-1080',
    status: StationStatus.ACTIVE,
    ownerId: 'user-1',
    alertSettings: {
      extremeHeat: true,
      frost: true,
      storm: false,
      criticalHumidity: true,
    },
    createdAt: new Date('2026-04-25T20:00:00.000Z'),
  };

  it('loads stations by owner id and maps them to the domain entity', async () => {
    const model = buildModel();
    const query = buildQuery([stationDocument]);
    const repository = new MongoWeatherStationRepository(model);

    model.find.mockReturnValue(query);

    const stations = await repository.findByOwnerId('user-1');

    expect(model.find).toHaveBeenCalledWith({ ownerId: 'user-1' });
    expect(stations).toHaveLength(1);
    expect(stations[0].getAlertSettings().toPrimitives().storm).toBe(false);
  });

  it('upserts the mapped station document when saving', async () => {
    const model = buildModel();
    const repository = new MongoWeatherStationRepository(model);
    const aggregate = {
      getId: () => 'station-2',
      getName: () => 'North',
      getLocation: () => ({
        getLatitude: () => -32.1,
        getLongitude: () => -60.3,
      }),
      getSensorModel: () => 'Davis',
      getStatus: () => StationStatus.INACTIVE,
      getOwnerId: () => 'user-2',
      getAlertSettings: () => ({
        toPrimitives: () => ({
          extremeHeat: false,
          frost: true,
          storm: true,
          criticalHumidity: false,
        }),
      }),
      getCreatedAt: () => new Date('2026-04-25T21:00:00.000Z'),
    } as any;

    model.replaceOne.mockResolvedValue({ acknowledged: true });

    await repository.save(aggregate);

    expect(model.replaceOne).toHaveBeenCalledWith(
      { _id: 'station-2' },
      {
        _id: 'station-2',
        name: 'North',
        location: {
          latitude: -32.1,
          longitude: -60.3,
        },
        sensorModel: 'Davis',
        status: StationStatus.INACTIVE,
        ownerId: 'user-2',
        alertSettings: {
          extremeHeat: false,
          frost: true,
          storm: true,
          criticalHumidity: false,
        },
        createdAt: new Date('2026-04-25T21:00:00.000Z'),
      },
      { upsert: true },
    );
  });
});
