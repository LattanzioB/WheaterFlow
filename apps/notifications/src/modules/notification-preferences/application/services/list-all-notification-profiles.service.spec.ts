import { ListAllNotificationProfilesService } from './list-all-notification-profiles.service';
import { INotificationProfileRepository } from '../../domain/ports/notification-profile-repository.port';
import { UserNotificationProfile } from '../../domain/entities/user-notification-profile.entity';

describe('ListAllNotificationProfilesService', () => {
  const buildRepository = (): jest.Mocked<INotificationProfileRepository> => ({
    findByUserId: jest.fn(),
    findByTelegramLinkCode: jest.fn(),
    findSubscribersByStationId: jest.fn(),
    findPage: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
  });

  it('lists notification profiles with defaults and the total count', async () => {
    const repository = buildRepository();
    const service = new ListAllNotificationProfilesService(repository);
    const profile = UserNotificationProfile.create({ userId: 'user-1' });

    repository.findPage.mockResolvedValue({
      profiles: [profile],
      total: 1,
    });

    await expect(service.execute()).resolves.toEqual({
      profiles: [profile],
      total: 1,
      limit: 20,
      offset: 0,
    });
    expect(repository.findPage).toHaveBeenCalledWith({
      limit: 20,
      offset: 0,
    });
  });

  it('forwards the requested pagination window to the repository', async () => {
    const repository = buildRepository();
    const service = new ListAllNotificationProfilesService(repository);

    repository.findPage.mockResolvedValue({ profiles: [], total: 12 });

    const result = await service.execute({ limit: 4, offset: 8 });

    expect(repository.findPage).toHaveBeenCalledWith({ limit: 4, offset: 8 });
    expect(result.total).toBe(12);
    expect(result.limit).toBe(4);
    expect(result.offset).toBe(8);
  });
});
