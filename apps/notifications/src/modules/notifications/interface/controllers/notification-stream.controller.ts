import { Controller, Req, Sse, UseGuards, MessageEvent } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { fromEventPattern, interval, merge, Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import {
  NOTIFICATION_DELIVERED_EVENT,
  NotificationDeliveredEvent,
} from '../../application/events/notification-delivered.event';
import { NotificationJwtAuthGuard } from '../guards/notification-jwt-auth.guard';
import type { AuthenticatedNotificationRequest } from '../guards/notification-jwt-auth.guard';
import { NotificationResponseMapper } from '../mappers/notification-response.mapper';

const HEARTBEAT_INTERVAL_MS = 25_000;

@Controller('notifications')
@UseGuards(NotificationJwtAuthGuard)
export class NotificationStreamController {
  constructor(private readonly eventEmitter: EventEmitter2) {}

  @Sse('stream')
  stream(
    @Req() req: AuthenticatedNotificationRequest,
  ): Observable<MessageEvent> {
    const userId = req.user?.userId;

    if (!userId) {
      throw new Error('Authenticated user is missing');
    }

    const notifications$ = fromEventPattern<NotificationDeliveredEvent>(
      (handler) => this.eventEmitter.on(NOTIFICATION_DELIVERED_EVENT, handler),
      (handler) => this.eventEmitter.off(NOTIFICATION_DELIVERED_EVENT, handler),
    ).pipe(
      filter((event) => event.userId === userId),
      map((event) => ({
        type: 'notification',
        data: NotificationResponseMapper.toResponse(event.notification),
      })),
    );

    const heartbeat$ = interval(HEARTBEAT_INTERVAL_MS).pipe(
      map(() => ({
        type: 'ping',
        data: 'ping',
      })),
    );

    return merge(notifications$, heartbeat$);
  }
}
