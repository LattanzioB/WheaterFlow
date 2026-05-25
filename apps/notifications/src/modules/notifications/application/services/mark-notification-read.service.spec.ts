import { AlertType } from '@contracts';
import { Notification } from '../../domain/entities/notification.entity';
import { INotificationRepository } from '../../domain/ports/notification-repository.port';
import { MarkNotificationReadService } from './mark-notification-read.service';

describe('MarkNotificationReadService', () => {
  const buildRepository = (): jest.Mocked<INotificationRepository> => ({
    save: jest.fn(),
    findById: jest.fn(),
    findByUserId: jest.fn(),
    markRead: jest.fn(),
    markAllRead: jest.fn(),
  });

  const notification = Notification.create({
    id: 'notification-1',
    userId: 'user-1',
    stationId: 'station-1',
    stationName: 'Central',
    alertType: AlertType.STORM,
    temperature: 24,
    humidity: 91,
    pressure: 970,
    reportedAt: new Date('2026-05-01T10:00:00.000Z'),
    messageId: 'message-1',
  });

  it('marks an owned notification as read', async () => {
    const repository = buildRepository();
    const service = new MarkNotificationReadService(repository);

    repository.markRead.mockResolvedValue(notification);

    await expect(
      service.execute({ id: 'notification-1', userId: 'user-1' }),
    ).resolves.toBe(notification);
    expect(repository.markRead).toHaveBeenCalledWith(
      'notification-1',
      'user-1',
    );
  });

  it('rejects missing or unowned notifications', async () => {
    const repository = buildRepository();
    const service = new MarkNotificationReadService(repository);

    repository.markRead.mockResolvedValue(null);

    await expect(
      service.execute({ id: 'notification-1', userId: 'user-2' }),
    ).rejects.toThrow('Notification not found');
  });
});
