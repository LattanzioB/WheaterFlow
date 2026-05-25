import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AlertType } from '@contracts';
import { Notification } from '../../domain/entities/notification.entity';
import { GetNotificationsService } from '../../application/services/get-notifications.service';
import { MarkAllNotificationsReadService } from '../../application/services/mark-all-notifications-read.service';
import { MarkNotificationReadService } from '../../application/services/mark-notification-read.service';
import { NotificationsController } from './notifications.controller';

describe('NotificationsController', () => {
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
    createdAt: new Date('2026-05-01T10:01:00.000Z'),
    messageId: 'message-1',
  });

  const buildController = () => {
    const getNotificationsService = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetNotificationsService>;
    const markNotificationReadService = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<MarkNotificationReadService>;
    const markAllNotificationsReadService = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<MarkAllNotificationsReadService>;
    const controller = new NotificationsController(
      getNotificationsService,
      markNotificationReadService,
      markAllNotificationsReadService,
    );

    return {
      controller,
      getNotificationsService,
      markNotificationReadService,
      markAllNotificationsReadService,
    };
  };

  const request = { user: { userId: 'user-1', email: 'user@example.com' } };

  it('returns the authenticated user notification page', async () => {
    const { controller, getNotificationsService } = buildController();

    getNotificationsService.execute.mockResolvedValue({
      notifications: [notification],
      nextCursor: 'next',
    });

    await expect(
      controller.list(request as any, { unreadOnly: true, limit: 10 }),
    ).resolves.toEqual({
      notifications: [
        expect.objectContaining({
          id: 'notification-1',
          userId: 'user-1',
          readAt: null,
        }),
      ],
      nextCursor: 'next',
    });
    expect(getNotificationsService.execute).toHaveBeenCalledWith({
      userId: 'user-1',
      unreadOnly: true,
      limit: 10,
      cursor: undefined,
    });
  });

  it('marks one notification as read', async () => {
    const { controller, markNotificationReadService } = buildController();

    markNotificationReadService.execute.mockResolvedValue(notification);

    await expect(
      controller.markRead('notification-1', request as any),
    ).resolves.toEqual(expect.objectContaining({ id: 'notification-1' }));
    expect(markNotificationReadService.execute).toHaveBeenCalledWith({
      id: 'notification-1',
      userId: 'user-1',
    });
  });

  it('maps missing notifications to 404', async () => {
    const { controller, markNotificationReadService } = buildController();

    markNotificationReadService.execute.mockRejectedValue(
      new Error('Notification not found'),
    );

    await expect(
      controller.markRead('missing', request as any),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('marks all notifications as read', async () => {
    const { controller, markAllNotificationsReadService } = buildController();

    markAllNotificationsReadService.execute.mockResolvedValue(4);

    await expect(controller.markAllRead(request as any)).resolves.toEqual({
      modifiedCount: 4,
    });
    expect(markAllNotificationsReadService.execute).toHaveBeenCalledWith(
      'user-1',
    );
  });

  it('rejects requests missing guard-populated user data', async () => {
    const { controller } = buildController();

    await expect(controller.list({} as any, {})).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
