import { Controller, MessageEvent, Req, Sse, UseGuards } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { fromEvent, fromEventPattern, interval, merge, Observable } from 'rxjs';
import { filter, map, takeUntil } from 'rxjs/operators';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  NOTIFICATION_DELIVERED_EVENT,
  NotificationDeliveredEvent,
} from '../../application/events/notification-delivered.event';
import { NotificationResponseDto } from '../dtos/notification.dto';
import { NotificationJwtAuthGuard } from '../guards/notification-jwt-auth.guard';
import type { AuthenticatedNotificationRequest } from '../guards/notification-jwt-auth.guard';
import { NotificationResponseMapper } from '../mappers/notification-response.mapper';

const HEARTBEAT_INTERVAL_MS = 25_000;

@ApiTags('Notifications')
@ApiBearerAuth('bearer')
@Controller('notifications')
@UseGuards(NotificationJwtAuthGuard)
export class NotificationStreamController {
  constructor(private readonly eventEmitter: EventEmitter2) {}

  @Sse('stream')
  @ApiOperation({
    summary: 'Stream live in-app notifications for the authenticated user',
    description:
      'Opens a server-sent events stream. Notification events use type "notification" and carry a NotificationResponseDto payload. Heartbeats use type "ping" every 25 seconds.',
  })
  @ApiQuery({
    name: 'token',
    required: false,
    description:
      'JWT fallback for native EventSource clients that cannot send Authorization headers.',
  })
  @ApiResponse({
    status: 200,
    description:
      'text/event-stream with notification events and periodic ping heartbeats.',
    type: NotificationResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Missing or invalid JWT.' })
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
    const close$ = fromEvent(req, 'close');

    return merge(notifications$, heartbeat$).pipe(takeUntil(close$));
  }
}
