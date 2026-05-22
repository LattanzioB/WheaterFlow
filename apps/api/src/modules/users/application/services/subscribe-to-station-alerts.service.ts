import { Inject, Injectable } from '@nestjs/common';
import { AlertType } from '../../../measurements/domain/value-objects/alert-type.enum';
import type { IStationRepository } from '../../../stations/domain/ports/station-repository.port';
import {
  NOTIFICATION_SERVICE_CLIENT_TOKEN,
  STATION_REPOSITORY_TOKEN,
  USER_REPOSITORY_TOKEN,
} from '@shared/tokens/injection-tokens';
import type { INotificationServiceClient } from '../../domain/ports/notification-service-client.port';
import type { IUserRepository } from '../../domain/ports/user-repository.port';
import {
  UserNotificationProfileService,
  UserWithNotificationProfile,
} from './user-notification-profile.service';

export interface SubscribeToStationAlertsCommand {
  userId: string;
  stationId: string;
  alertTypes?: AlertType[];
}

@Injectable()
export class SubscribeToStationAlertsService {
  constructor(
    @Inject(USER_REPOSITORY_TOKEN)
    private readonly userRepository: IUserRepository,
    @Inject(STATION_REPOSITORY_TOKEN)
    private readonly stationRepository: IStationRepository,
    @Inject(NOTIFICATION_SERVICE_CLIENT_TOKEN)
    private readonly notificationServiceClient: INotificationServiceClient,
    private readonly userNotificationProfileService: UserNotificationProfileService,
  ) {}

  async execute(
    command: SubscribeToStationAlertsCommand,
  ): Promise<UserWithNotificationProfile> {
    const user = await this.userRepository.findById(command.userId);

    if (!user) {
      throw new Error('User not found');
    }

    const station = await this.stationRepository.findById(command.stationId);

    if (!station) {
      throw new Error('Station not found');
    }

    const notificationProfile = await this.notificationServiceClient.subscribe({
      userId: command.userId,
      stationId: command.stationId,
      alertTypes: command.alertTypes,
    });

    return this.userNotificationProfileService.withRemoteProfile(
      user,
      notificationProfile,
    );
  }
}
