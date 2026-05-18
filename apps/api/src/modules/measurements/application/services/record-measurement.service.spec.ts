import { EventEmitter2 } from '@nestjs/event-emitter';
import { IMeasurementRepository } from '../../domain/ports/measurement-repository.port';
import {
  RecordMeasurementCommand,
  RecordMeasurementService,
} from './record-measurement.service';
import { IStationRepository } from '../../../stations/domain/ports/station-repository.port';
import { MeasurementAlertDetectedEvent } from '@contracts/measurements/measurement-alert-detected.event';
import { WeatherStation } from '../../../stations/domain/entities/weather-station.entity';
import { Location } from '../../../stations/domain/value-objects/location.value-object';
import { StationAlertSettings } from '../../../stations/domain/value-objects/station-alert-settings.value-object';
import { AlertType } from '../../domain/value-objects/alert-type.enum';

describe('RecordMeasurementService', () => {
  const command: RecordMeasurementCommand = {
    stationId: 'station-1',
    temperature: 41,
    humidity: 65,
    pressure: 1005,
    reportedAt: new Date('2026-04-25T17:00:00.000Z'),
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

  const buildEventEmitter = (): jest.Mocked<Pick<EventEmitter2, 'emit'>> => ({
    emit: jest.fn(),
  });

  it('records a measurement and emits an alert event when thresholds are met', async () => {
    const measurementRepository = buildMeasurementRepository();
    const stationRepository = buildStationRepository();
    const eventEmitter = buildEventEmitter();
    const service = new RecordMeasurementService(
      measurementRepository,
      stationRepository,
      eventEmitter as EventEmitter2,
    );

    stationRepository.findById.mockResolvedValue(buildStation());

    const result = await service.execute(command);

    expect(stationRepository.findById.mock.calls).toEqual([['station-1']]);
    expect(measurementRepository.save.mock.calls).toHaveLength(1);
    expect(result.getAlertType()).toBe(AlertType.EXTREME_HEAT);
    expect(eventEmitter.emit.mock.calls).toHaveLength(1);
    expect(eventEmitter.emit.mock.calls[0][0]).toBe(
      MeasurementAlertDetectedEvent.EVENT_NAME,
    );

    const emittedEvent = eventEmitter.emit.mock
      .calls[0][1] as MeasurementAlertDetectedEvent;
    expect(emittedEvent.measurementId).toBe(result.getId());
    expect(emittedEvent.stationId).toBe('station-1');
    expect(emittedEvent.alertType).toBe(AlertType.EXTREME_HEAT);
  });

  it('records a measurement without emitting when there is no alert', async () => {
    const measurementRepository = buildMeasurementRepository();
    const stationRepository = buildStationRepository();
    const eventEmitter = buildEventEmitter();
    const service = new RecordMeasurementService(
      measurementRepository,
      stationRepository,
      eventEmitter as EventEmitter2,
    );

    stationRepository.findById.mockResolvedValue(buildStation());

    const result = await service.execute({
      ...command,
      temperature: 24,
    });

    expect(result.getAlertType()).toBe(AlertType.NONE);
    expect(eventEmitter.emit.mock.calls).toHaveLength(0);
  });

  it('rejects unknown stations before saving measurements', async () => {
    const measurementRepository = buildMeasurementRepository();
    const stationRepository = buildStationRepository();
    const eventEmitter = buildEventEmitter();
    const service = new RecordMeasurementService(
      measurementRepository,
      stationRepository,
      eventEmitter as EventEmitter2,
    );

    stationRepository.findById.mockResolvedValue(null);

    await expect(service.execute(command)).rejects.toThrow('Station not found');
    expect(measurementRepository.save.mock.calls).toHaveLength(0);
    expect(eventEmitter.emit.mock.calls).toHaveLength(0);
  });
});
