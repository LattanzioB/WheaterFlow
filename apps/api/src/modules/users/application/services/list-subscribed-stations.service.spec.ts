import { AlertType } from '../../../measurements/domain/value-objects/alert-type.enum';
import { IMeasurementRepository } from '../../../measurements/domain/ports/measurement-repository.port';
import { IStationRepository } from '../../../stations/domain/ports/station-repository.port';
import { IUserRepository } from '../../domain/ports/user-repository.port';
import { INotificationServiceClient } from '../../domain/ports/notification-service-client.port';
import { ListSubscribedStationsService } from './list-subscribed-stations.service';

describe('ListSubscribedStationsService', () => {
  const buildUserRepository = (): jest.Mocked<IUserRepository> => ({
    findById: jest.fn(),
    findByEmail: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
    findAll: jest.fn(),
  });

  const buildStationRepository = (): jest.Mocked<IStationRepository> => ({
    findById: jest.fn(),
    findByIds: jest.fn(),
    findByOwnerId: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
    findAll: jest.fn(),
  });

  const buildMeasurementRepository =
    (): jest.Mocked<IMeasurementRepository> => ({
      findById: jest.fn(),
      findByStationId: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      findWithFilters: jest.fn(),
      findLatestByStationIds: jest.fn(),
    });

  const buildNotificationClient = (): jest.Mocked<INotificationServiceClient> => ({
    getProfile: jest.fn(),
    listSubscriptions: jest.fn(),
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
    updateAlertPreferences: jest.fn(),
    updateDeliveryChannels: jest.fn(),
    createTelegramLinkCode: jest.fn(),
  });

  const buildUser = () => ({
    getId: () => 'user-1',
  });

  const buildStation = (id: string, name: string) =>
    ({
      getId: () => id,
      getName: () => name,
    }) as any;

  const buildMeasurement = (
    stationId: string,
    hasAlert: boolean,
    alertType: AlertType,
  ) =>
    ({
      getStationId: () => stationId,
      hasAlert: () => hasAlert,
      getAlertType: () => alertType,
    }) as any;

  it('returns subscribed stations with their latest measurements', async () => {
    const userRepository = buildUserRepository();
    const notificationClient = buildNotificationClient();
    const stationRepository = buildStationRepository();
    const measurementRepository = buildMeasurementRepository();
    const service = new ListSubscribedStationsService(
      userRepository,
      notificationClient,
      stationRepository,
      measurementRepository,
    );

    userRepository.findById.mockResolvedValue(buildUser() as any);
    notificationClient.listSubscriptions.mockResolvedValue([
      {
        stationId: 'station-1',
        alertTypes: [AlertType.STORM],
      },
      {
        stationId: 'station-2',
        alertTypes: [AlertType.FROST],
      },
    ]);
    stationRepository.findByIds.mockResolvedValue([
      buildStation('station-1', 'Central'),
      buildStation('station-2', 'North'),
    ]);
    measurementRepository.findLatestByStationIds.mockResolvedValue([
      buildMeasurement('station-1', true, AlertType.STORM),
      buildMeasurement('station-2', false, AlertType.NONE),
    ]);

    await expect(
      service.execute({
        userId: 'user-1',
      }),
    ).resolves.toEqual([
      expect.objectContaining({
        stationId: 'station-1',
        alertTypes: [AlertType.STORM],
        hasActiveAlert: true,
      }),
      expect.objectContaining({
        stationId: 'station-2',
        alertTypes: [AlertType.FROST],
        hasActiveAlert: false,
      }),
    ]);
  });

  it('filters the response to active alerts only when requested', async () => {
    const userRepository = buildUserRepository();
    const notificationClient = buildNotificationClient();
    const stationRepository = buildStationRepository();
    const measurementRepository = buildMeasurementRepository();
    const service = new ListSubscribedStationsService(
      userRepository,
      notificationClient,
      stationRepository,
      measurementRepository,
    );

    userRepository.findById.mockResolvedValue(buildUser() as any);
    notificationClient.listSubscriptions.mockResolvedValue([
      {
        stationId: 'station-1',
        alertTypes: [AlertType.STORM],
      },
      {
        stationId: 'station-2',
        alertTypes: [AlertType.FROST],
      },
    ]);
    stationRepository.findByIds.mockResolvedValue([
      buildStation('station-1', 'Central'),
      buildStation('station-2', 'North'),
    ]);
    measurementRepository.findLatestByStationIds.mockResolvedValue([
      buildMeasurement('station-1', true, AlertType.STORM),
      buildMeasurement('station-2', false, AlertType.NONE),
    ]);

    await expect(
      service.execute({
        userId: 'user-1',
        activeAlertOnly: true,
      }),
    ).resolves.toEqual([
      expect.objectContaining({
        stationId: 'station-1',
        hasActiveAlert: true,
      }),
    ]);
  });

  it('throws when the user does not exist', async () => {
    const userRepository = buildUserRepository();
    const notificationClient = buildNotificationClient();
    const stationRepository = buildStationRepository();
    const measurementRepository = buildMeasurementRepository();
    const service = new ListSubscribedStationsService(
      userRepository,
      notificationClient,
      stationRepository,
      measurementRepository,
    );

    userRepository.findById.mockResolvedValue(null);

    await expect(
      service.execute({
        userId: 'user-1',
      }),
    ).rejects.toThrow('User not found');
  });
});
