import { Inject, Injectable } from '@nestjs/common';
import {
  NOTIFICATION_SERVICE_CLIENT_TOKEN,
  USER_REPOSITORY_TOKEN,
} from '@shared/tokens/injection-tokens';
import type { INotificationServiceClient } from '../../domain/ports/notification-service-client.port';
import type { IUserRepository } from '../../domain/ports/user-repository.port';
import {
  UserNotificationProfileService,
  UserWithNotificationProfile,
} from './user-notification-profile.service';

export interface UnsubscribeFromStationAlertsCommand {
  userId: string;
  stationId: string;
}

@Injectable()
export class UnsubscribeFromStationAlertsService {
  constructor(
    @Inject(USER_REPOSITORY_TOKEN)
    private readonly userRepository: IUserRepository,
    @Inject(NOTIFICATION_SERVICE_CLIENT_TOKEN)
    private readonly notificationServiceClient: INotificationServiceClient,
    private readonly userNotificationProfileService: UserNotificationProfileService,
  ) {}

  async execute(
    command: UnsubscribeFromStationAlertsCommand,
  ): Promise<UserWithNotificationProfile> {
    const user = await this.userRepository.findById(command.userId);

    if (!user) {
      throw new Error('User not found');
    }

    const notificationProfile =
      await this.notificationServiceClient.unsubscribe(command);

    return this.userNotificationProfileService.withRemoteProfile(
      user,
      notificationProfile,
    );
  }
}
