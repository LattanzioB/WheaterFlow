import { Inject, Injectable } from '@nestjs/common';
import { NOTIFICATION_PROFILE_REPOSITORY_TOKEN } from '@shared/tokens/injection-tokens';
import { UserNotificationProfile } from '../../domain/entities/user-notification-profile.entity';
import type { INotificationProfileRepository } from '../../domain/ports/notification-profile-repository.port';
import { NotificationProfileAccessService } from './notification-profile-access.service';

export interface UnsubscribeFromStationAlertsCommand {
  userId: string;
  stationId: string;
}

@Injectable()
export class UnsubscribeFromStationAlertsService {
  constructor(
    private readonly profileAccessService: NotificationProfileAccessService,
    @Inject(NOTIFICATION_PROFILE_REPOSITORY_TOKEN)
    private readonly profileRepository: INotificationProfileRepository,
  ) {}

  async execute(
    command: UnsubscribeFromStationAlertsCommand,
  ): Promise<UserNotificationProfile> {
    const profile = await this.profileAccessService.requireExisting(
      command.userId,
    );

    profile.unsubscribeFromAlerts(command.stationId);
    await this.profileRepository.save(profile);

    return profile;
  }
}
