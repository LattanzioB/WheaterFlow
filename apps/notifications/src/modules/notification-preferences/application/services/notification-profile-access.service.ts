import { Inject, Injectable } from '@nestjs/common';
import { NOTIFICATION_PROFILE_REPOSITORY_TOKEN } from '@shared/tokens/injection-tokens';
import { UserNotificationProfile } from '../../domain/entities/user-notification-profile.entity';
import type { INotificationProfileRepository } from '../../domain/ports/notification-profile-repository.port';

@Injectable()
export class NotificationProfileAccessService {
  constructor(
    @Inject(NOTIFICATION_PROFILE_REPOSITORY_TOKEN)
    private readonly profileRepository: INotificationProfileRepository,
  ) {}

  async getOrCreate(userId: string): Promise<UserNotificationProfile> {
    const normalizedUserId = userId.trim();

    if (!normalizedUserId) {
      throw new Error('User id cannot be empty');
    }

    const existingProfile =
      await this.profileRepository.findByUserId(normalizedUserId);

    if (existingProfile) {
      return existingProfile;
    }

    const profile = UserNotificationProfile.create({
      userId: normalizedUserId,
    });
    await this.profileRepository.save(profile);

    return profile;
  }

  async requireExisting(userId: string): Promise<UserNotificationProfile> {
    const profile = await this.profileRepository.findByUserId(userId.trim());

    if (!profile) {
      throw new Error('Notification profile not found');
    }

    return profile;
  }
}
