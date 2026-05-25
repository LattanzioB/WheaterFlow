import { Inject, Injectable } from '@nestjs/common';
import { NOTIFICATION_REPOSITORY_TOKEN } from '@shared/tokens/injection-tokens';
import type {
  FindNotificationsByUserIdResult,
  INotificationRepository,
} from '../../domain/ports/notification-repository.port';

export interface GetNotificationsQuery {
  userId: string;
  limit?: number;
  cursor?: string;
  unreadOnly?: boolean;
}

@Injectable()
export class GetNotificationsService {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY_TOKEN)
    private readonly notificationRepository: INotificationRepository,
  ) {}

  execute(
    query: GetNotificationsQuery,
  ): Promise<FindNotificationsByUserIdResult> {
    return this.notificationRepository.findByUserId({
      userId: query.userId,
      limit: query.limit ?? 20,
      cursor: query.cursor,
      unreadOnly: query.unreadOnly,
    });
  }
}
