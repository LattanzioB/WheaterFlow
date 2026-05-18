import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AlertType } from '../../../measurements/domain/value-objects/alert-type.enum';
import { CreateTelegramLinkCodeService } from '../../application/services/create-telegram-link-code.service';
import { GetUserByIdService } from '../../application/services/get-user-by-id.service';
import { ListSubscribedStationsService } from '../../application/services/list-subscribed-stations.service';
import { SubscribeToStationAlertsService } from '../../application/services/subscribe-to-station-alerts.service';
import { UnsubscribeFromStationAlertsService } from '../../application/services/unsubscribe-from-station-alerts.service';
import { UpdateDeliveryChannelsService } from '../../application/services/update-delivery-channels.service';
import { UpdateStationAlertPreferencesService } from '../../application/services/update-station-alert-preferences.service';
import { UserNotificationPreferencesController } from './user-notification-preferences.controller';

describe('UserNotificationPreferencesController', () => {
  const buildConfigService = () =>
    ({
      get: jest.fn().mockReturnValue('weatherflow_bot'),
    }) as unknown as jest.Mocked<ConfigService>;

  const buildLinkCodeService = () =>
    ({
      execute: jest.fn(),
    }) as unknown as jest.Mocked<CreateTelegramLinkCodeService>;

  const buildGetUserByIdService = () =>
    ({
      execute: jest.fn(),
    }) as unknown as jest.Mocked<GetUserByIdService>;
  const buildListSubscribedStationsService = () =>
    ({
      execute: jest.fn(),
    }) as unknown as jest.Mocked<ListSubscribedStationsService>;

  const buildSubscribeService = () =>
    ({
      execute: jest.fn(),
    }) as unknown as jest.Mocked<SubscribeToStationAlertsService>;

  const buildUnsubscribeService = () =>
    ({
      execute: jest.fn(),
    }) as unknown as jest.Mocked<UnsubscribeFromStationAlertsService>;

  const buildUpdatePreferencesService = () =>
    ({
      execute: jest.fn(),
    }) as unknown as jest.Mocked<UpdateStationAlertPreferencesService>;

  const buildUpdateDeliveryService = () =>
    ({
      execute: jest.fn(),
    }) as unknown as jest.Mocked<UpdateDeliveryChannelsService>;

  const buildUser = () => ({
    getId: () => 'user-1',
    getName: () => 'Bruno',
    getLastName: () => 'Lattanzio',
    getEmail: () => ({ getValue: () => 'bruno@example.com' }),
    getNotificationPreferences: () => [
      {
        stationId: 'station-1',
        alertTypes: [AlertType.STORM],
      },
    ],
    getDeliveryChannels: () => ({
      telegram: {
        chatId: '12345',
      },
    }),
    getCreatedAt: () => new Date('2026-04-25T12:00:00.000Z'),
  });

  const request = {
    user: {
      userId: 'user-1',
      email: 'bruno@example.com',
    },
  } as any;

  it('subscribes the authenticated user to station alerts', async () => {
    const subscribeService = buildSubscribeService();
    const controller = new UserNotificationPreferencesController(
      buildConfigService(),
      buildLinkCodeService(),
      buildGetUserByIdService(),
      buildListSubscribedStationsService(),
      subscribeService,
      buildUnsubscribeService(),
      buildUpdatePreferencesService(),
      buildUpdateDeliveryService(),
    );

    subscribeService.execute.mockResolvedValue(buildUser() as any);

    await expect(
      controller.subscribe(
        'user-1',
        'station-1',
        { alertTypes: [AlertType.STORM] },
        request,
      ),
    ).resolves.toMatchObject({
      id: 'user-1',
      notificationPreferences: [
        {
          stationId: 'station-1',
          alertTypes: [AlertType.STORM],
        },
      ],
    });
  });

  it('rejects attempts to manage another user settings', async () => {
    const controller = new UserNotificationPreferencesController(
      buildConfigService(),
      buildLinkCodeService(),
      buildGetUserByIdService(),
      buildListSubscribedStationsService(),
      buildSubscribeService(),
      buildUnsubscribeService(),
      buildUpdatePreferencesService(),
      buildUpdateDeliveryService(),
    );

    await expect(
      controller.unsubscribe('user-2', 'station-1', request),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('updates station alert preferences', async () => {
    const updatePreferencesService = buildUpdatePreferencesService();
    const controller = new UserNotificationPreferencesController(
      buildConfigService(),
      buildLinkCodeService(),
      buildGetUserByIdService(),
      buildListSubscribedStationsService(),
      buildSubscribeService(),
      buildUnsubscribeService(),
      updatePreferencesService,
      buildUpdateDeliveryService(),
    );

    updatePreferencesService.execute.mockResolvedValue(buildUser() as any);

    await expect(
      controller.updateAlertPreferences(
        'user-1',
        'station-1',
        { alertTypes: [AlertType.STORM] },
        request,
      ),
    ).resolves.toMatchObject({
      id: 'user-1',
    });
  });

  it('updates delivery channels', async () => {
    const updateDeliveryService = buildUpdateDeliveryService();
    const controller = new UserNotificationPreferencesController(
      buildConfigService(),
      buildLinkCodeService(),
      buildGetUserByIdService(),
      buildListSubscribedStationsService(),
      buildSubscribeService(),
      buildUnsubscribeService(),
      buildUpdatePreferencesService(),
      updateDeliveryService,
    );

    updateDeliveryService.execute.mockResolvedValue(buildUser() as any);

    await expect(
      controller.updateDeliveryChannels(
        'user-1',
        {
          deliveryChannels: {
            telegram: {
              chatId: '12345',
            },
          },
        },
        request,
      ),
    ).resolves.toMatchObject({
      deliveryChannels: {
        telegram: {
          chatId: '12345',
        },
      },
    });
  });

  it('maps missing domain resources to not found responses', async () => {
    const subscribeService = buildSubscribeService();
    const controller = new UserNotificationPreferencesController(
      buildConfigService(),
      buildLinkCodeService(),
      buildGetUserByIdService(),
      buildListSubscribedStationsService(),
      subscribeService,
      buildUnsubscribeService(),
      buildUpdatePreferencesService(),
      buildUpdateDeliveryService(),
    );

    subscribeService.execute.mockRejectedValue(new Error('Station not found'));

    await expect(
      controller.subscribe('user-1', 'missing', {}, request),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('creates a Telegram link code for the authenticated user', async () => {
    const linkCodeService = buildLinkCodeService();
    const controller = new UserNotificationPreferencesController(
      buildConfigService(),
      linkCodeService,
      buildGetUserByIdService(),
      buildListSubscribedStationsService(),
      buildSubscribeService(),
      buildUnsubscribeService(),
      buildUpdatePreferencesService(),
      buildUpdateDeliveryService(),
    );

    linkCodeService.execute.mockResolvedValue({
      code: 'WF-A1B2C3D4',
      expiresAt: new Date('2026-04-25T12:10:00.000Z'),
    });

    await expect(
      controller.createTelegramLinkCode('user-1', request),
    ).resolves.toEqual({
      code: 'WF-A1B2C3D4',
      expiresAt: '2026-04-25T12:10:00.000Z',
      instructions: 'Send /link WF-A1B2C3D4 to the WeatherFlow Telegram bot.',
      botUsername: 'weatherflow_bot',
      botUrl: 'https://t.me/weatherflow_bot',
    });
  });

  it('returns the authenticated user profile', async () => {
    const getUserByIdService = buildGetUserByIdService();
    const controller = new UserNotificationPreferencesController(
      buildConfigService(),
      buildLinkCodeService(),
      getUserByIdService,
      buildListSubscribedStationsService(),
      buildSubscribeService(),
      buildUnsubscribeService(),
      buildUpdatePreferencesService(),
      buildUpdateDeliveryService(),
    );

    getUserByIdService.execute.mockResolvedValue(buildUser() as any);

    await expect(controller.getCurrentUser(request)).resolves.toMatchObject({
      id: 'user-1',
      email: 'bruno@example.com',
    });
    expect(getUserByIdService.execute).toHaveBeenCalledWith('user-1');
  });
  it('lists subscribed stations with latest measurement status', async () => {
    const listSubscribedStationsService = buildListSubscribedStationsService();
    const controller = new UserNotificationPreferencesController(
      buildConfigService(),
      buildLinkCodeService(),
      buildGetUserByIdService(),
      listSubscribedStationsService,
      buildSubscribeService(),
      buildUnsubscribeService(),
      buildUpdatePreferencesService(),
      buildUpdateDeliveryService(),
    );

    listSubscribedStationsService.execute.mockResolvedValue([
      {
        stationId: 'station-1',
        alertTypes: [AlertType.STORM],
        hasActiveAlert: true,
        station: {
          getId: () => 'station-1',
          getName: () => 'Central',
          getLocation: () => ({
            getLatitude: () => -34.6037,
            getLongitude: () => -58.3816,
          }),
          getSensorModel: () => 'WH-1080',
          getStatus: () => 'active',
          getOwnerId: () => 'user-2',
          getAlertSettings: () => ({
            toPrimitives: () => ({
              extremeHeat: true,
              frost: true,
              storm: false,
              criticalHumidity: false,
            }),
          }),
          getCreatedAt: () => new Date('2026-04-25T12:00:00.000Z'),
        },
        latestMeasurement: {
          getId: () => 'measurement-1',
          getStationId: () => 'station-1',
          getTemperature: () => ({ getValue: () => 41 }),
          getHumidity: () => ({ getValue: () => 60 }),
          getPressure: () => ({ getValue: () => 1002 }),
          getReportedAt: () => new Date('2026-04-26T18:00:00.000Z'),
          hasAlert: () => true,
          getAlertType: () => AlertType.STORM,
        },
      },
    ] as any);

    await expect(
      controller.listSubscriptions(
        'user-1',
        { activeAlertOnly: true },
        request,
      ),
    ).resolves.toEqual([
      {
        stationId: 'station-1',
        alertTypes: [AlertType.STORM],
        hasActiveAlert: true,
        station: {
          id: 'station-1',
          name: 'Central',
          location: {
            latitude: -34.6037,
            longitude: -58.3816,
          },
          sensorModel: 'WH-1080',
          status: 'active',
          ownerId: 'user-2',
          alertSettings: {
            extremeHeat: true,
            frost: true,
            storm: false,
            criticalHumidity: false,
          },
          createdAt: '2026-04-25T12:00:00.000Z',
        },
        latestMeasurement: {
          id: 'measurement-1',
          stationId: 'station-1',
          temperature: 41,
          humidity: 60,
          pressure: 1002,
          reportedAt: '2026-04-26T18:00:00.000Z',
          alertStatus: true,
          alertType: AlertType.STORM,
        },
      },
    ]);
    expect(listSubscribedStationsService.execute).toHaveBeenCalledWith({
      userId: 'user-1',
      activeAlertOnly: true,
    });
  });
});
