import { Inject, Injectable } from '@nestjs/common';
import { AlertType } from '@contracts/measurements/alert-type';
import { NOTIFICATION_PROFILE_REPOSITORY_TOKEN } from '@shared/tokens/injection-tokens';
import { UserNotificationProfile } from '../../domain/entities/user-notification-profile.entity';
import type { INotificationProfileRepository } from '../../domain/ports/notification-profile-repository.port';
import { NotificationProfileAccessService } from './notification-profile-access.service';

export interface SubscribeToStationAlertsCommand {
  userId: string;
  stationId: string;
  alertTypes?: AlertType[];
}

@Injectable()
export class SubscribeToStationAlertsService {
  constructor(
    private readonly profileAccessService: NotificationProfileAccessService,
    @Inject(NOTIFICATION_PROFILE_REPOSITORY_TOKEN)
    private readonly profileRepository: INotificationProfileRepository,
  ) {}

  async execute(
    command: SubscribeToStationAlertsCommand,
  ): Promise<UserNotificationProfile> {
    const profile = await this.profileAccessService.getOrCreate(command.userId);

    profile.subscribeToAlerts(command.stationId, command.alertTypes);
    await this.profileRepository.save(profile);

    return profile;
  }
}
