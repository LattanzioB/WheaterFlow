import { IMeasurementRepository } from '../../domain/ports/measurement-repository.port';
import {
  RecordMeasurementCommand,
  RecordMeasurementService,
} from './record-measurement.service';
import { IStationRepository } from '../../../stations/domain/ports/station-repository.port';
import type { AlertPublisher } from '../ports/alert-publisher.port';
import { WeatherStation } from '../../../stations/domain/entities/weather-station.entity';
import { Location } from '../../../stations/domain/value-objects/location.value-object';
import { StationAlertSettings } from '../../../stations/domain/value-objects/station-alert-settings.value-object';
import { AlertType } from '../../domain/value-objects/alert-type.enum';
import { Logger } from '@nestjs/common';
import { MeasurementSource } from '../../domain/value-objects/measurement-source.enum';

describe('RecordMeasurementService', () => {
  const command: RecordMeasurementCommand = {
    stationId: 'station-1',
    temperature: 41,
    humidity: 65,
    pressure: 1005,
    reportedAt: new Date('2026-04-25T17:00:00.000Z'),
    source: MeasurementSource.OPENWEATHER,
  };

  const buildMeasurementRepository =
    (): jest.Mocked<IMeasurementRepository> => ({
      findById: jest.fn(),
      findByStationId: jest.fn(),
      findLatestByStationIds: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      findWithFilters: jest.fn(),
    });

  const buildStationRepository = (): jest.Mocked<IStationRepository> => ({
    findById: jest.fn(),
    findByIds: jest.fn(),
    findByOwnerId: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
    findAll: jest.fn(),
  });

  const buildStation = () =>
    WeatherStation.create({
      id: 'station-1',
      name: 'Central',
      location: Location.create(-34.6037, -58.3816),
      sensorModel: 'WH-1080',
      ownerId: 'user-1',
      alertSettings: StationAlertSettings.create(),
    });

  const buildAlertPublisher = (): jest.Mocked<AlertPublisher> => ({
    publishClimateAlert: jest.fn().mockResolvedValue(undefined),
  });

  it('records a measurement and publishes an alert message when thresholds are met', async () => {
    const measurementRepository = buildMeasurementRepository();
    const stationRepository = buildStationRepository();
    const alertPublisher = buildAlertPublisher();
    const service = new RecordMeasurementService(
      measurementRepository,
      stationRepository,
      alertPublisher,
    );

    stationRepository.findById.mockResolvedValue(buildStation());

    const result = await service.execute(command);

    expect(stationRepository.findById.mock.calls).toEqual([['station-1']]);
    expect(measurementRepository.save.mock.calls).toHaveLength(1);
    expect(result.getAlertType()).toBe(AlertType.EXTREME_HEAT);
    expect(result.getSource()).toBe(MeasurementSource.OPENWEATHER);
    expect(alertPublisher.publishClimateAlert.mock.calls).toEqual([
      [
        {
          messageId: expect.any(String),
          occurredAt: expect.any(String),
          measurementId: result.getId(),
          stationId: 'station-1',
          stationName: 'Central',
          alertType: AlertType.EXTREME_HEAT,
          reportedAt: '2026-04-25T17:00:00.000Z',
          temperature: 41,
          humidity: 65,
          pressure: 1005,
        },
      ],
    ]);
  });

  it('records a measurement without publishing when there is no alert', async () => {
    const measurementRepository = buildMeasurementRepository();
    const stationRepository = buildStationRepository();
    const alertPublisher = buildAlertPublisher();
    const service = new RecordMeasurementService(
      measurementRepository,
      stationRepository,
      alertPublisher,
    );

    stationRepository.findById.mockResolvedValue(buildStation());

    const result = await service.execute({
      ...command,
      temperature: 24,
    });

    expect(result.getAlertType()).toBe(AlertType.NONE);
    expect(alertPublisher.publishClimateAlert.mock.calls).toHaveLength(0);
  });

  it('rejects unknown stations before saving measurements', async () => {
    const measurementRepository = buildMeasurementRepository();
    const stationRepository = buildStationRepository();
    const alertPublisher = buildAlertPublisher();
    const service = new RecordMeasurementService(
      measurementRepository,
      stationRepository,
      alertPublisher,
    );

    stationRepository.findById.mockResolvedValue(null);

    await expect(service.execute(command)).rejects.toThrow('Station not found');
    expect(measurementRepository.save.mock.calls).toHaveLength(0);
    expect(alertPublisher.publishClimateAlert.mock.calls).toHaveLength(0);
  });

  it('returns the saved measurement when alert publishing fails after persistence', async () => {
    const measurementRepository = buildMeasurementRepository();
    const stationRepository = buildStationRepository();
    const alertPublisher = buildAlertPublisher();
    const loggerSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation();
    const service = new RecordMeasurementService(
      measurementRepository,
      stationRepository,
      alertPublisher,
    );

    stationRepository.findById.mockResolvedValue(buildStation());
    alertPublisher.publishClimateAlert.mockRejectedValue(
      new Error('broker unavailable'),
    );

    const result = await service.execute(command);

    expect(result.getAlertType()).toBe(AlertType.EXTREME_HEAT);
    expect(measurementRepository.save.mock.calls).toHaveLength(1);
    expect(alertPublisher.publishClimateAlert.mock.calls).toHaveLength(1);
    expect(loggerSpy).toHaveBeenCalledWith(
      'Climate alert message could not be published after measurement persistence',
      expect.stringContaining('broker unavailable'),
    );

    loggerSpy.mockRestore();
  });
});
