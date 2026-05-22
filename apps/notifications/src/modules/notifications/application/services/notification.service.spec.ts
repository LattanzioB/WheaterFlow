import { AlertNotifier } from '../../domain/ports/alert-notifier.port';
import { NotificationService } from './notification.service';
import { IMeasurementRepository } from '@api/modules/measurements/domain/ports/measurement-repository.port';
import { MeasurementAlertDetectedEvent } from '@contracts/measurements/measurement-alert-detected.event';
import { IStationRepository } from '@api/modules/stations/domain/ports/station-repository.port';
import { Measurement } from '@api/modules/measurements/domain/entities/measurement.entity';
import { Temperature } from '@api/modules/measurements/domain/value-objects/temperature.value-object';
import { Humidity } from '@api/modules/measurements/domain/value-objects/humidity.value-object';
import { Pressure } from '@api/modules/measurements/domain/value-objects/pressure.value-object';
import { AlertType } from '@contracts/measurements/alert-type';
import { WeatherStation } from '@api/modules/stations/domain/entities/weather-station.entity';
import { Location } from '@api/modules/stations/domain/value-objects/location.value-object';
import { UserNotificationProfile } from '../../../notification-preferences/domain/entities/user-notification-profile.entity';
import { INotificationProfileRepository } from '../../../notification-preferences/domain/ports/notification-profile-repository.port';

describe('NotificationService', () => {
  const buildAlertNotifier = (): jest.Mocked<AlertNotifier> => ({
    sendMeasurementAlert: jest.fn(),
  });

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

  const buildNotificationProfileRepository =
    (): jest.Mocked<INotificationProfileRepository> => ({
      findByUserId: jest.fn(),
      findByTelegramLinkCode: jest.fn(),
      findSubscribersByStationId: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
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

  it('filters recipients by alert preference and configured delivery targets', async () => {
    const alertNotifier = buildAlertNotifier();
    const measurementRepository = buildMeasurementRepository();
    const stationRepository = buildStationRepository();
    const notificationProfileRepository = buildNotificationProfileRepository();
    const service = new NotificationService(
      alertNotifier,
      measurementRepository,
      stationRepository,
      notificationProfileRepository,
    );

    measurementRepository.findById.mockResolvedValue(measurement);
    stationRepository.findById.mockResolvedValue(station);
    notificationProfileRepository.findSubscribersByStationId.mockResolvedValue([
      UserNotificationProfile.create({
        userId: 'user-1',
        notificationPreferences: [
          {
            stationId: 'station-1',
            alertTypes: [AlertType.STORM],
          },
        ],
        deliveryChannels: {
          telegram: {
            chatId: '12345',
          },
        },
      }),
      UserNotificationProfile.create({
        userId: 'user-2',
        notificationPreferences: [
          {
            stationId: 'station-1',
            alertTypes: [AlertType.STORM],
          },
        ],
      }),
      UserNotificationProfile.create({
        userId: 'user-3',
        notificationPreferences: [
          {
            stationId: 'station-1',
            alertTypes: [AlertType.FROST],
          },
        ],
        deliveryChannels: {
          telegram: {
            chatId: '67890',
          },
        },
      }),
    ]);

    await service.handleAlert(event);

    expect(
      notificationProfileRepository.findSubscribersByStationId.mock.calls,
    ).toEqual([['station-1']]);
    expect(alertNotifier.sendMeasurementAlert.mock.calls).toHaveLength(2);
    expect(alertNotifier.sendMeasurementAlert.mock.calls[0][0]).toMatchObject({
      userId: 'user-1',
      deliveryTargets: [
        { channel: 'telegram', destination: '12345' },
        { channel: 'log', destination: 'user-1' },
      ],
    });
    expect(alertNotifier.sendMeasurementAlert.mock.calls[1][0]).toMatchObject({
      userId: 'user-2',
      deliveryTargets: [{ channel: 'log', destination: 'user-2' }],
    });
  });

  it('skips notification delivery when the measurement is missing', async () => {
    const alertNotifier = buildAlertNotifier();
    const measurementRepository = buildMeasurementRepository();
    const stationRepository = buildStationRepository();
    const notificationProfileRepository = buildNotificationProfileRepository();
    const service = new NotificationService(
      alertNotifier,
      measurementRepository,
      stationRepository,
      notificationProfileRepository,
    );

    measurementRepository.findById.mockResolvedValue(null);

    await service.handleAlert(event);

    expect(stationRepository.findById.mock.calls).toHaveLength(0);
    expect(
      notificationProfileRepository.findSubscribersByStationId.mock.calls,
    ).toHaveLength(0);
    expect(alertNotifier.sendMeasurementAlert.mock.calls).toHaveLength(0);
  });
});
