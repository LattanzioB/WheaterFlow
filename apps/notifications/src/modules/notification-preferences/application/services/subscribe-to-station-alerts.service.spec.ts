import { AlertType } from '@contracts/measurements/alert-type';
import { INotificationProfileRepository } from '../../domain/ports/notification-profile-repository.port';
import { NotificationProfileAccessService } from './notification-profile-access.service';
import { SubscribeToStationAlertsService } from './subscribe-to-station-alerts.service';

describe('SubscribeToStationAlertsService', () => {
  const buildRepository = (): jest.Mocked<INotificationProfileRepository> => ({
    findByUserId: jest.fn(),
    findByTelegramLinkCode: jest.fn(),
    findSubscribersByStationId: jest.fn(),
    findPage: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
  });

  it('creates a profile and subscribes the user to a station', async () => {
    const repository = buildRepository();
    const service = new SubscribeToStationAlertsService(
      new NotificationProfileAccessService(repository),
      repository,
    );

    repository.findByUserId.mockResolvedValue(null);

    const result = await service.execute({
      userId: 'user-1',
      stationId: 'station-1',
      alertTypes: [AlertType.STORM],
    });

    expect(result.getNotificationPreferences()).toEqual([
      {
        stationId: 'station-1',
        alertTypes: [AlertType.STORM],
      },
    ]);
    expect(repository.save.mock.calls).toHaveLength(2);
  });
});
