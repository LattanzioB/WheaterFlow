import {
  BadRequestException,
  INestApplication,
  NotFoundException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { AlertType } from '@contracts';
import { Notification } from '../../domain/entities/notification.entity';
import { ListUserNotificationsService } from '../../application/services/list-user-notifications.service';
import { MarkAllNotificationsReadService } from '../../application/services/mark-all-notifications-read.service';
import { MarkNotificationReadService } from '../../application/services/mark-notification-read.service';
import { NotificationsController } from './notifications.controller';

describe('NotificationsController', () => {
  const notification = Notification.create({
    id: '4d9784cb-c6a1-4a5d-9c58-fd824f9dbf25',
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
    const listUserNotificationsService = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<ListUserNotificationsService>;
    const markNotificationReadService = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<MarkNotificationReadService>;
    const markAllNotificationsReadService = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<MarkAllNotificationsReadService>;
    const controller = new NotificationsController(
      listUserNotificationsService,
      markNotificationReadService,
      markAllNotificationsReadService,
    );

    return {
      controller,
      listUserNotificationsService,
      markNotificationReadService,
      markAllNotificationsReadService,
    };
  };

  const authRequest = { user: { userId: 'user-1', email: 'user@example.com' } };

  it('returns the authenticated user notification page', async () => {
    const { controller, listUserNotificationsService } = buildController();

    listUserNotificationsService.execute.mockResolvedValue({
      notifications: [notification],
      nextCursor: 'next',
      unreadCount: 2,
    });

    await expect(
      controller.list(authRequest as any, { unreadOnly: true, limit: 10 }),
    ).resolves.toEqual({
      items: [
        expect.objectContaining({
          id: '4d9784cb-c6a1-4a5d-9c58-fd824f9dbf25',
          userId: 'user-1',
          readAt: null,
        }),
      ],
      nextCursor: 'next',
      unreadCount: 2,
    });
    expect(listUserNotificationsService.execute).toHaveBeenCalledWith({
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
      controller.markRead(
        { id: '4d9784cb-c6a1-4a5d-9c58-fd824f9dbf25' },
        authRequest as any,
      ),
    ).resolves.toBeUndefined();
    expect(markNotificationReadService.execute).toHaveBeenCalledWith({
      id: '4d9784cb-c6a1-4a5d-9c58-fd824f9dbf25',
      userId: 'user-1',
    });
  });

  it('maps missing notifications to 404', async () => {
    const { controller, markNotificationReadService } = buildController();

    markNotificationReadService.execute.mockRejectedValue(
      new Error('Notification not found'),
    );

    await expect(
      controller.markRead(
        { id: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa' },
        authRequest as any,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('marks all notifications as read', async () => {
    const { controller, markAllNotificationsReadService } = buildController();

    markAllNotificationsReadService.execute.mockResolvedValue(4);

    await expect(
      controller.markAllRead(authRequest as any),
    ).resolves.toBeUndefined();
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

  it('returns 401 before handlers when authentication is missing', async () => {
    const { listUserNotificationsService } = buildController();
    const moduleRef = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [
        {
          provide: ListUserNotificationsService,
          useValue: listUserNotificationsService,
        },
        {
          provide: MarkNotificationReadService,
          useValue: { execute: jest.fn() },
        },
        {
          provide: MarkAllNotificationsReadService,
          useValue: { execute: jest.fn() },
        },
        {
          provide: JwtService,
          useValue: { verify: jest.fn() },
        },
      ],
    }).compile();
    const app: INestApplication = moduleRef.createNestApplication();

    await app.init();
    await request(app.getHttpServer()).get('/notifications').expect(401);
    await app.close();
  });
});
