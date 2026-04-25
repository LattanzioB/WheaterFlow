import {
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { AlertType } from '../../../measurements/domain/value-objects/alert-type.enum';
import { SubscribeToStationAlertsService } from '../../application/services/subscribe-to-station-alerts.service';
import { UnsubscribeFromStationAlertsService } from '../../application/services/unsubscribe-from-station-alerts.service';
import { UpdateDeliveryChannelsService } from '../../application/services/update-delivery-channels.service';
import { UpdateStationAlertPreferencesService } from '../../application/services/update-station-alert-preferences.service';
import { UserNotificationPreferencesController } from './user-notification-preferences.controller';

describe('UserNotificationPreferencesController', () => {
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
});
