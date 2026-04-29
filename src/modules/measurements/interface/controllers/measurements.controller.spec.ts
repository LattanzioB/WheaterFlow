import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { AlertType } from '../../domain/value-objects/alert-type.enum';
import { QueryMeasurementsService } from '../../application/services/query-measurements.service';
import { RecordMeasurementService } from '../../application/services/record-measurement.service';
import { GetStationByIdService } from '../../../stations/application/services/get-station-by-id.service';
import { MeasurementsController } from './measurements.controller';

describe('MeasurementsController', () => {
  const buildRecordService = () =>
    ({
      execute: jest.fn(),
    }) as unknown as jest.Mocked<RecordMeasurementService>;
  const buildQueryService = () =>
    ({
      execute: jest.fn(),
    }) as unknown as jest.Mocked<QueryMeasurementsService>;
  const buildGetStationService = () =>
    ({ execute: jest.fn() }) as unknown as jest.Mocked<GetStationByIdService>;

  const buildStation = (ownerId = 'user-1') => ({
    getOwnerId: () => ownerId,
  });

  const buildMeasurement = () => ({
    getId: () => 'measurement-1',
    getStationId: () => 'station-1',
    getTemperature: () => ({ getValue: () => 42.5 }),
    getHumidity: () => ({ getValue: () => 65 }),
    getPressure: () => ({ getValue: () => 1008 }),
    getReportedAt: () => new Date('2026-04-25T12:00:00.000Z'),
    hasAlert: () => true,
    getAlertType: () => AlertType.EXTREME_HEAT,
  });

  const request = {
    user: {
      userId: 'user-1',
      email: 'bruno@example.com',
    },
  } as any;

  it('records measurements for stations owned by the authenticated user', async () => {
    const recordService = buildRecordService();
    const getStationService = buildGetStationService();
    const controller = new MeasurementsController(
      recordService,
      buildQueryService(),
      getStationService,
    );

    getStationService.execute.mockResolvedValue(buildStation() as any);
    recordService.execute.mockResolvedValue(buildMeasurement() as any);

    await expect(
      controller.create(
        {
          stationId: 'station-1',
          temperature: 42.5,
          humidity: 65,
          pressure: 1008,
          reportedAt: '2026-04-25T12:00:00.000Z',
        },
        request,
      ),
    ).resolves.toMatchObject({
      id: 'measurement-1',
      alertType: AlertType.EXTREME_HEAT,
    });
  });

  it('rejects measurement writes for stations owned by another user', async () => {
    const controller = new MeasurementsController(
      buildRecordService(),
      buildQueryService(),
      buildGetStationService(),
    );

    controller['getStationByIdService'].execute = jest
      .fn()
      .mockResolvedValue(buildStation('user-2'));

    await expect(
      controller.create(
        {
          stationId: 'station-1',
          temperature: 42.5,
          humidity: 65,
          pressure: 1008,
        },
        request,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('maps missing stations to not found responses', async () => {
    const getStationService = buildGetStationService();
    const controller = new MeasurementsController(
      buildRecordService(),
      buildQueryService(),
      getStationService,
    );

    getStationService.execute.mockRejectedValue(new Error('Station not found'));

    await expect(
      controller.create(
        {
          stationId: 'missing',
          temperature: 42.5,
          humidity: 65,
          pressure: 1008,
        },
        request,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('queries measurements with filter passthrough', async () => {
    const queryService = buildQueryService();
    const controller = new MeasurementsController(
      buildRecordService(),
      queryService,
      buildGetStationService(),
    );

    queryService.execute.mockResolvedValue([buildMeasurement() as any]);

    await expect(
      controller.query({
        stationName: 'Central',
        tempMin: 10,
        tempMax: 30,
        alertOnly: true,
      }),
    ).resolves.toHaveLength(1);
    expect(queryService.execute).toHaveBeenCalledWith({
      stationName: 'Central',
      tempMin: 10,
      tempMax: 30,
      alertOnly: true,
    });
  });
});
