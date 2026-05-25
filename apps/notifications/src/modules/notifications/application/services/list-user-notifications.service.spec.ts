import { ListUserNotificationsService } from './list-user-notifications.service';
import { INotificationRepository } from '../../domain/ports/notification-repository.port';

describe('ListUserNotificationsService', () => {
  const buildRepository = (): jest.Mocked<INotificationRepository> => ({
    save: jest.fn(),
    findById: jest.fn(),
    findByUserId: jest.fn(),
    countUnread: jest.fn(),
    markRead: jest.fn(),
    markAllRead: jest.fn(),
  });

  it('lists notifications for the authenticated user with defaults and unread total', async () => {
    const repository = buildRepository();
    const service = new ListUserNotificationsService(repository);

    repository.findByUserId.mockResolvedValue({
      notifications: [],
      nextCursor: null,
    });
    repository.countUnread.mockResolvedValue(3);

    await expect(
      service.execute({ userId: 'user-1', unreadOnly: true }),
    ).resolves.toEqual({
      notifications: [],
      nextCursor: null,
      unreadCount: 3,
    });
    expect(repository.findByUserId).toHaveBeenCalledWith({
      userId: 'user-1',
      limit: 20,
      cursor: undefined,
      unreadOnly: true,
    });
    expect(repository.countUnread).toHaveBeenCalledWith('user-1');
  });
});
