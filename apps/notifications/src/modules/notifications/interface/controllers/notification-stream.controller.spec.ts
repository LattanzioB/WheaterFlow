import { INestApplication } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { AlertType } from '@contracts';
import { EventEmitter } from 'events';
import request from 'supertest';
import {
  NOTIFICATION_DELIVERED_EVENT,
  NotificationDeliveredEvent,
} from '../../application/events/notification-delivered.event';
import { Notification } from '../../domain/entities/notification.entity';
import { NotificationStreamController } from './notification-stream.controller';

describe('NotificationStreamController', () => {
  const buildRequest = (userId = 'user-1') =>
    Object.assign(new EventEmitter(), {
      user: { userId, email: `${userId}@example.com` },
    });

  const buildNotification = (userId: string) =>
    Notification.create({
      id: `notification-${userId}`,
      userId,
      stationId: 'station-1',
      stationName: 'Central',
      alertType: AlertType.STORM,
      temperature: 24,
      humidity: 91,
      pressure: 970,
      reportedAt: new Date('2026-05-01T10:00:00.000Z'),
      messageId: `message-${userId}`,
    });

  it('emits delivered notifications only to the matching user', () => {
    const eventEmitter = new EventEmitter2();
    const controller = new NotificationStreamController(eventEmitter);
    const messages: unknown[] = [];
    const subscription = controller
      .stream(buildRequest('user-1') as any)
      .subscribe((message) => messages.push(message));
    const event: NotificationDeliveredEvent = {
      userId: 'user-1',
      notification: buildNotification('user-1'),
    };

    eventEmitter.emit(NOTIFICATION_DELIVERED_EVENT, {
      userId: 'user-2',
      notification: buildNotification('user-2'),
    } satisfies NotificationDeliveredEvent);
    eventEmitter.emit(NOTIFICATION_DELIVERED_EVENT, event);

    subscription.unsubscribe();

    expect(messages).toEqual([
      {
        type: 'notification',
        data: expect.objectContaining({
          id: 'notification-user-1',
          userId: 'user-1',
        }),
      },
    ]);
  });

  it('removes the event listener when the client unsubscribes', () => {
    const eventEmitter = new EventEmitter2();
    const controller = new NotificationStreamController(eventEmitter);
    const subscription = controller
      .stream(buildRequest('user-1') as any)
      .subscribe();

    expect(eventEmitter.listenerCount(NOTIFICATION_DELIVERED_EVENT)).toBe(1);

    subscription.unsubscribe();

    expect(eventEmitter.listenerCount(NOTIFICATION_DELIVERED_EVENT)).toBe(0);
  });

  it('emits heartbeat events every 25 seconds', () => {
    jest.useFakeTimers();

    const eventEmitter = new EventEmitter2();
    const controller = new NotificationStreamController(eventEmitter);
    const messages: unknown[] = [];
    const subscription = controller
      .stream(buildRequest('user-1') as any)
      .subscribe((message) => messages.push(message));

    jest.advanceTimersByTime(25_000);
    subscription.unsubscribe();
    jest.useRealTimers();

    expect(messages).toContainEqual({ type: 'ping', data: 'ping' });
  });

  it('cleans up listeners and timers when the request closes', () => {
    jest.useFakeTimers();

    const eventEmitter = new EventEmitter2();
    const controller = new NotificationStreamController(eventEmitter);
    const req = buildRequest('user-1');
    const messages: unknown[] = [];
    const subscription = controller
      .stream(req as any)
      .subscribe((message) => messages.push(message));

    expect(eventEmitter.listenerCount(NOTIFICATION_DELIVERED_EVENT)).toBe(1);

    req.emit('close');
    jest.advanceTimersByTime(50_000);
    subscription.unsubscribe();
    jest.useRealTimers();

    expect(eventEmitter.listenerCount(NOTIFICATION_DELIVERED_EVENT)).toBe(0);
    expect(messages).toEqual([]);
  });

  it('does not leak listeners across repeated reconnects', () => {
    const eventEmitter = new EventEmitter2();
    const controller = new NotificationStreamController(eventEmitter);
    const baseline = eventEmitter.listenerCount(NOTIFICATION_DELIVERED_EVENT);

    for (let index = 0; index < 5; index += 1) {
      const req = buildRequest('user-1');
      controller.stream(req as any).subscribe();
      req.emit('close');
    }

    expect(eventEmitter.listenerCount(NOTIFICATION_DELIVERED_EVENT)).toBe(
      baseline,
    );
  });

  it('returns 401 before opening the stream when authentication is missing', async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [NotificationStreamController],
      providers: [
        EventEmitter2,
        {
          provide: JwtService,
          useValue: { verify: jest.fn() },
        },
      ],
    }).compile();
    const app: INestApplication = moduleRef.createNestApplication();

    await app.init();
    await request(app.getHttpServer()).get('/notifications/stream').expect(401);
    await app.close();
  });
});
