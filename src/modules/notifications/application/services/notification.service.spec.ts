import { AlertNotifier } from '../ports/alert-notifier.port';
import { NotificationService } from './notification.service';
import { IMeasurementRepository } from '../../../measurements/application/ports/measurement-repository.port';
import { MeasurementAlertDetectedEvent } from '../../../measurements/domain/events/measurement-alert-detected.event';
import { IStationRepository } from '../../../stations/application/ports/station-repository.port';
import { IUserRepository } from '../../../users/application/ports/user-repository.port';
import { Measurement } from '../../../measurements/domain/entities/measurement.entity';
import { Temperature } from '../../../measurements/domain/value-objects/temperature.value-object';
import { Humidity } from '../../../measurements/domain/value-objects/humidity.value-object';
import { Pressure } from '../../../measurements/domain/value-objects/pressure.value-object';
import { AlertType } from '../../../measurements/domain/value-objects/alert-type.enum';
import { WeatherStation } from '../../../stations/domain/entities/weather-station.entity';
import { Location } from '../../../stations/domain/value-objects/location.value-object';
import { User } from '../../../users/domain/entities/user.entity';
import { Email } from '../../../users/domain/value-objects/email.value-object';

describe('NotificationService', () => {
  const buildAlertNotifier = (): jest.Mocked<AlertNotifier> => ({
    sendMeasurementAlert: jest.fn(),
  });

  const buildMeasurementRepository =
    (): jest.Mocked<IMeasurementRepository> => ({
      findById: jest.fn(),
      findByStationId: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      findWithFilters: jest.fn(),
    });

  const buildStationRepository = (): jest.Mocked<IStationRepository> => ({
    findById: jest.fn(),
    findByOwnerId: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
    findAll: jest.fn(),
  });

  const buildUserRepository = (): jest.Mocked<IUserRepository> => ({
    findById: jest.fn(),
    findByEmail: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
    findAll: jest.fn(),
    findSubscribersByStationId: jest.fn(),
  });

  const event = new MeasurementAlertDetectedEvent(
    'measurement-1',
    'station-1',
    AlertType.STORM,
  );

  const measurement = Measurement.create({
    id: 'measurement-1',
    stationId: 'station-1',
    temperature: Temperature.create(25),
    humidity: Humidity.create(92),
    pressure: Pressure.create(970),
    reportedAt: new Date('2026-04-25T17:30:00.000Z'),
    alertStatus: true,
    alertType: AlertType.STORM,
  });

  const station = WeatherStation.create({
    id: 'station-1',
    name: 'Central',
    location: Location.create(-34.6037, -58.3816),
    sensorModel: 'WH-1080',
    ownerId: 'owner-1',
  });

  it('notifies subscribers with telegram chat ids', async () => {
    const alertNotifier = buildAlertNotifier();
    const measurementRepository = buildMeasurementRepository();
    const stationRepository = buildStationRepository();
    const userRepository = buildUserRepository();
    const service = new NotificationService(
      alertNotifier,
      measurementRepository,
      stationRepository,
      userRepository,
    );

    measurementRepository.findById.mockResolvedValue(measurement);
    stationRepository.findById.mockResolvedValue(station);
    userRepository.findSubscribersByStationId.mockResolvedValue([
      User.create({
        id: 'user-1',
        name: 'Bruno',
        lastName: 'Lattanzio',
        email: Email.create('bruno@example.com'),
        passwordHash: 'hash',
        telegramChatId: '12345',
      }),
      User.create({
        id: 'user-2',
        name: 'Ana',
        lastName: 'Observer',
        email: Email.create('ana@example.com'),
        passwordHash: 'hash',
      }),
    ]);

    await service.handleAlert(event);

    expect(alertNotifier.sendMeasurementAlert.mock.calls).toEqual([
      [
        {
          userId: 'user-1',
          telegramChatId: '12345',
          measurementId: 'measurement-1',
          stationId: 'station-1',
          stationName: 'Central',
          alertType: AlertType.STORM,
          reportedAt: new Date('2026-04-25T17:30:00.000Z'),
          temperature: 25,
          humidity: 92,
          pressure: 970,
        },
      ],
    ]);
  });

  it('skips notification delivery when the measurement is missing', async () => {
    const alertNotifier = buildAlertNotifier();
    const measurementRepository = buildMeasurementRepository();
    const stationRepository = buildStationRepository();
    const userRepository = buildUserRepository();
    const service = new NotificationService(
      alertNotifier,
      measurementRepository,
      stationRepository,
      userRepository,
    );

    measurementRepository.findById.mockResolvedValue(null);

    await service.handleAlert(event);

    expect(stationRepository.findById.mock.calls).toHaveLength(0);
    expect(userRepository.findSubscribersByStationId.mock.calls).toHaveLength(
      0,
    );
    expect(alertNotifier.sendMeasurementAlert.mock.calls).toHaveLength(0);
  });
});
