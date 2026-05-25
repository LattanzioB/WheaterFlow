import { Inject, Injectable } from '@nestjs/common';
import { NOTIFICATION_REPOSITORY_TOKEN } from '@shared/tokens/injection-tokens';
import type { INotificationRepository } from '../../domain/ports/notification-repository.port';

@Injectable()
export class MarkAllNotificationsReadService {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY_TOKEN)
    private readonly notificationRepository: INotificationRepository,
  ) {}

  execute(userId: string): Promise<number> {
    return this.notificationRepository.markAllRead(userId);
  }
}
