import { Inject, Injectable } from '@nestjs/common';
import { NOTIFICATION_REPOSITORY_TOKEN } from '@shared/tokens/injection-tokens';
import { Notification } from '../../domain/entities/notification.entity';
import type { INotificationRepository } from '../../domain/ports/notification-repository.port';

export interface ListUserNotificationsQuery {
  userId: string;
  limit?: number;
  cursor?: string;
  unreadOnly?: boolean;
}

export interface ListUserNotificationsResult {
  notifications: Notification[];
  nextCursor: string | null;
  unreadCount: number;
}

@Injectable()
export class ListUserNotificationsService {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY_TOKEN)
    private readonly notificationRepository: INotificationRepository,
  ) {}

  async execute(
    query: ListUserNotificationsQuery,
  ): Promise<ListUserNotificationsResult> {
    const [page, unreadCount] = await Promise.all([
      this.notificationRepository.findByUserId({
        userId: query.userId,
        limit: query.limit ?? 20,
        cursor: query.cursor,
        unreadOnly: query.unreadOnly,
      }),
      this.notificationRepository.countUnread(query.userId),
    ]);

    return {
      notifications: page.notifications,
      nextCursor: page.nextCursor,
      unreadCount,
    };
  }
}
