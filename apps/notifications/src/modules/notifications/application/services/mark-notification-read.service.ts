import { Inject, Injectable } from '@nestjs/common';
import { NOTIFICATION_REPOSITORY_TOKEN } from '@shared/tokens/injection-tokens';
import { Notification } from '../../domain/entities/notification.entity';
import type { INotificationRepository } from '../../domain/ports/notification-repository.port';

export interface MarkNotificationReadCommand {
  id: string;
  userId: string;
}

@Injectable()
export class MarkNotificationReadService {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY_TOKEN)
    private readonly notificationRepository: INotificationRepository,
  ) {}

  async execute(command: MarkNotificationReadCommand): Promise<Notification> {
    const notification = await this.notificationRepository.markRead(
      command.id,
      command.userId,
    );

    if (!notification) {
      throw new Error('Notification not found');
    }

    return notification;
  }
}
