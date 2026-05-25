import { INotificationRepository } from '../../domain/ports/notification-repository.port';
import { MarkAllNotificationsReadService } from './mark-all-notifications-read.service';

describe('MarkAllNotificationsReadService', () => {
  const buildRepository = (): jest.Mocked<INotificationRepository> => ({
    save: jest.fn(),
    findById: jest.fn(),
    findByUserId: jest.fn(),
    markRead: jest.fn(),
    markAllRead: jest.fn(),
  });

  it('marks all unread notifications for the user', async () => {
    const repository = buildRepository();
    const service = new MarkAllNotificationsReadService(repository);

    repository.markAllRead.mockResolvedValue(3);

    await expect(service.execute('user-1')).resolves.toBe(3);
    expect(repository.markAllRead).toHaveBeenCalledWith('user-1');
  });
});
