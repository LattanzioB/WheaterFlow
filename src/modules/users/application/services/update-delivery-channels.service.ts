import { Inject, Injectable } from '@nestjs/common';
import { USER_REPOSITORY_TOKEN } from '../../../../shared/tokens/injection-tokens';
import type { IUserRepository } from '../../domain/ports/user-repository.port';
import type {
  User,
  UserDeliveryChannelsInput,
} from '../../domain/entities/user.entity';

export interface UpdateDeliveryChannelsCommand {
  userId: string;
  deliveryChannels: UserDeliveryChannelsInput;
}

@Injectable()
export class UpdateDeliveryChannelsService {
  constructor(
    @Inject(USER_REPOSITORY_TOKEN)
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(command: UpdateDeliveryChannelsCommand): Promise<User> {
    const user = await this.userRepository.findById(command.userId);

    if (!user) {
      throw new Error('User not found');
    }

    if (command.deliveryChannels.telegram?.chatId !== undefined) {
      user.configureTelegramDelivery(command.deliveryChannels.telegram.chatId);
    }

    await this.userRepository.save(user);

    return user;
  }
}
