import { GetNotificationsService } from './get-notifications.service';
import { INotificationRepository } from '../../domain/ports/notification-repository.port';

describe('GetNotificationsService', () => {
  const buildRepository = (): jest.Mocked<INotificationRepository> => ({
    save: jest.fn(),
    findById: jest.fn(),
    findByUserId: jest.fn(),
    markRead: jest.fn(),
    markAllRead: jest.fn(),
  });

  it('lists notifications for the authenticated user with defaults', async () => {
    const repository = buildRepository();
    const service = new GetNotificationsService(repository);

    repository.findByUserId.mockResolvedValue({
      notifications: [],
      nextCursor: null,
    });

    await service.execute({ userId: 'user-1', unreadOnly: true });

    expect(repository.findByUserId).toHaveBeenCalledWith({
      userId: 'user-1',
      limit: 20,
      cursor: undefined,
      unreadOnly: true,
    });
  });
});
