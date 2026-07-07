import { Inject, Injectable } from '@nestjs/common';
import { NOTIFICATION_REPOSITORY_TOKEN } from '@shared/tokens/injection-tokens';
import { Notification } from '../../domain/entities/notification.entity';
import type { INotificationRepository } from '../../domain/ports/notification-repository.port';

export interface ListAllNotificationsQuery {
  limit?: number;
  offset?: number;
}

export interface ListAllNotificationsResult {
  notifications: Notification[];
  total: number;
  limit: number;
  offset: number;
}

const DEFAULT_LIMIT = 20;

@Injectable()
export class ListAllNotificationsService {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY_TOKEN)
    private readonly notificationRepository: INotificationRepository,
  ) {}

  async execute(
    query: ListAllNotificationsQuery = {},
  ): Promise<ListAllNotificationsResult> {
    const limit = query.limit ?? DEFAULT_LIMIT;
    const offset = query.offset ?? 0;
    const page = await this.notificationRepository.findAllPage({
      limit,
      offset,
    });

    return {
      notifications: page.notifications,
      total: page.total,
      limit,
      offset,
    };
  }
}
