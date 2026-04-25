import { ForbiddenException } from '@nestjs/common';
import { StationStatus } from '../../domain/value-objects/station-status.enum';
import { CreateStationService } from '../../application/services/create-station.service';
import { DeleteStationService } from '../../application/services/delete-station.service';
import { GetStationByIdService } from '../../application/services/get-station-by-id.service';
import { ListUserStationsService } from '../../application/services/list-user-stations.service';
import { UpdateStationService } from '../../application/services/update-station.service';
import { WeatherStationsController } from './weather-stations.controller';

describe('WeatherStationsController', () => {
  const buildCreateService = () =>
    ({ execute: jest.fn() }) as unknown as jest.Mocked<CreateStationService>;
  const buildListService = () =>
    ({ execute: jest.fn() }) as unknown as jest.Mocked<ListUserStationsService>;
  const buildGetService = () =>
    ({ execute: jest.fn() }) as unknown as jest.Mocked<GetStationByIdService>;
  const buildUpdateService = () =>
    ({ execute: jest.fn() }) as unknown as jest.Mocked<UpdateStationService>;
  const buildDeleteService = () =>
    ({ execute: jest.fn() }) as unknown as jest.Mocked<DeleteStationService>;

  const buildStation = (ownerId = 'user-1') => ({
    getId: () => 'station-1',
    getName: () => 'Central',
    getLocation: () => ({
      getLatitude: () => -34.6037,
      getLongitude: () => -58.3816,
    }),
    getSensorModel: () => 'WH-1080',
    getStatus: () => StationStatus.ACTIVE,
    getOwnerId: () => ownerId,
    getAlertSettings: () => ({
      toPrimitives: () => ({
        extremeHeat: true,
        frost: true,
        storm: false,
        criticalHumidity: true,
      }),
    }),
    getCreatedAt: () => new Date('2026-04-25T12:00:00.000Z'),
  });

  const request = {
    user: {
      userId: 'user-1',
      email: 'bruno@example.com',
    },
  } as any;

  it('lists stations for the authenticated owner', async () => {
    const listService = buildListService();
    const controller = new WeatherStationsController(
      buildCreateService(),
      listService,
      buildGetService(),
      buildUpdateService(),
      buildDeleteService(),
    );

    listService.execute.mockResolvedValue([buildStation() as any]);

    await expect(controller.list(request)).resolves.toHaveLength(1);
    expect(listService.execute).toHaveBeenCalledWith({ ownerId: 'user-1' });
  });

  it('creates a station for the authenticated owner', async () => {
    const createService = buildCreateService();
    const controller = new WeatherStationsController(
      createService,
      buildListService(),
      buildGetService(),
      buildUpdateService(),
      buildDeleteService(),
    );

    createService.execute.mockResolvedValue(buildStation() as any);

    await expect(
      controller.create(
        {
          name: 'Central',
          location: {
            latitude: -34.6037,
            longitude: -58.3816,
          },
          sensorModel: 'WH-1080',
        },
        request,
      ),
    ).resolves.toMatchObject({
      ownerId: 'user-1',
    });
  });

  it('returns a station only to its owner', async () => {
    const getService = buildGetService();
    const controller = new WeatherStationsController(
      buildCreateService(),
      buildListService(),
      getService,
      buildUpdateService(),
      buildDeleteService(),
    );

    getService.execute.mockResolvedValue(buildStation() as any);

    await expect(controller.getById('station-1', request)).resolves.toMatchObject(
      {
        id: 'station-1',
      },
    );
  });

  it('rejects access to stations owned by another user', async () => {
    const getService = buildGetService();
    const controller = new WeatherStationsController(
      buildCreateService(),
      buildListService(),
      getService,
      buildUpdateService(),
      buildDeleteService(),
    );

    getService.execute.mockResolvedValue(buildStation('user-2') as any);

    await expect(controller.getById('station-1', request)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('updates and deletes only after ownership passes', async () => {
    const getService = buildGetService();
    const updateService = buildUpdateService();
    const deleteService = buildDeleteService();
    const controller = new WeatherStationsController(
      buildCreateService(),
      buildListService(),
      getService,
      updateService,
      deleteService,
    );

    getService.execute.mockResolvedValue(buildStation() as any);
    updateService.execute.mockResolvedValue(buildStation() as any);
    deleteService.execute.mockResolvedValue(undefined);

    await expect(
      controller.update(
        'station-1',
        {
          sensorModel: 'Davis',
        },
        request,
      ),
    ).resolves.toMatchObject({
      sensorModel: 'WH-1080',
    });
    await expect(controller.delete('station-1', request)).resolves.toBeUndefined();
  });
});
