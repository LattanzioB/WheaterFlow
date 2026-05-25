import { EventEmitter2 } from '@nestjs/event-emitter';
import { AlertType } from '@contracts';
import {
  NOTIFICATION_DELIVERED_EVENT,
  NotificationDeliveredEvent,
} from '../../application/events/notification-delivered.event';
import { Notification } from '../../domain/entities/notification.entity';
import { NotificationStreamController } from './notification-stream.controller';

describe('NotificationStreamController', () => {
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
      .stream({
        user: { userId: 'user-1', email: 'user@example.com' },
      } as any)
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
      .stream({
        user: { userId: 'user-1', email: 'user@example.com' },
      } as any)
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
      .stream({
        user: { userId: 'user-1', email: 'user@example.com' },
      } as any)
      .subscribe((message) => messages.push(message));

    jest.advanceTimersByTime(25_000);
    subscription.unsubscribe();
    jest.useRealTimers();

    expect(messages).toContainEqual({ type: 'ping', data: 'ping' });
  });
});
