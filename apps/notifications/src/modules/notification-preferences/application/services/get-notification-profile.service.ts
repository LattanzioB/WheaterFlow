import { Inject, Injectable } from '@nestjs/common';
import { NOTIFICATION_PROFILE_REPOSITORY_TOKEN } from '@shared/tokens/injection-tokens';
import { UserNotificationProfile } from '../../domain/entities/user-notification-profile.entity';
import type { INotificationProfileRepository } from '../../domain/ports/notification-profile-repository.port';

@Injectable()
export class GetNotificationProfileService {
  constructor(
    @Inject(NOTIFICATION_PROFILE_REPOSITORY_TOKEN)
    private readonly profileRepository: INotificationProfileRepository,
  ) {}

  async execute(userId: string): Promise<UserNotificationProfile | null> {
    const normalizedUserId = userId.trim();

    if (!normalizedUserId) {
      throw new Error('User id cannot be empty');
    }

    return this.profileRepository.findByUserId(normalizedUserId);
  }
}
