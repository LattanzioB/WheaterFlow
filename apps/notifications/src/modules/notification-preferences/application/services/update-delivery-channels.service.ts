import { Inject, Injectable } from '@nestjs/common';
import { NOTIFICATION_PROFILE_REPOSITORY_TOKEN } from '@shared/tokens/injection-tokens';
import {
  DeliveryChannelsInput,
  UserNotificationProfile,
} from '../../domain/entities/user-notification-profile.entity';
import type { INotificationProfileRepository } from '../../domain/ports/notification-profile-repository.port';
import { NotificationProfileAccessService } from './notification-profile-access.service';

export interface UpdateDeliveryChannelsCommand {
  userId: string;
  deliveryChannels: DeliveryChannelsInput;
}

@Injectable()
export class UpdateDeliveryChannelsService {
  constructor(
    private readonly profileAccessService: NotificationProfileAccessService,
    @Inject(NOTIFICATION_PROFILE_REPOSITORY_TOKEN)
    private readonly profileRepository: INotificationProfileRepository,
  ) {}

  async execute(
    command: UpdateDeliveryChannelsCommand,
  ): Promise<UserNotificationProfile> {
    const profile = await this.profileAccessService.getOrCreate(command.userId);

    if (command.deliveryChannels.telegram?.chatId !== undefined) {
      profile.configureTelegramDelivery(
        command.deliveryChannels.telegram.chatId,
      );
    }

    if (command.deliveryChannels.log?.enabled !== undefined) {
      profile.configureLogDelivery(command.deliveryChannels.log.enabled);
    }

    await this.profileRepository.save(profile);

    return profile;
  }
}
