import { ListAllNotificationsService } from './list-all-notifications.service';
import { INotificationRepository } from '../../domain/ports/notification-repository.port';

describe('ListAllNotificationsService', () => {
  const buildRepository = (): jest.Mocked<INotificationRepository> => ({
    save: jest.fn(),
    findById: jest.fn(),
    findByUserId: jest.fn(),
    findAllPage: jest.fn(),
    countUnread: jest.fn(),
    markRead: jest.fn(),
    markAllRead: jest.fn(),
  });

  it('lists the notifications collection with defaults and the total count', async () => {
    const repository = buildRepository();
    const service = new ListAllNotificationsService(repository);

    repository.findAllPage.mockResolvedValue({
      notifications: [],
      total: 7,
    });

    await expect(service.execute()).resolves.toEqual({
      notifications: [],
      total: 7,
      limit: 20,
      offset: 0,
    });
    expect(repository.findAllPage).toHaveBeenCalledWith({
      limit: 20,
      offset: 0,
    });
  });

  it('forwards the requested pagination window to the repository', async () => {
    const repository = buildRepository();
    const service = new ListAllNotificationsService(repository);

    repository.findAllPage.mockResolvedValue({
      notifications: [],
      total: 30,
    });

    const result = await service.execute({ limit: 5, offset: 10 });

    expect(repository.findAllPage).toHaveBeenCalledWith({
      limit: 5,
      offset: 10,
    });
    expect(result.limit).toBe(5);
    expect(result.offset).toBe(10);
  });
});
