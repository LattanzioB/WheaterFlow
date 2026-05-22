import { Inject, Injectable } from '@nestjs/common';
import type { IUserRepository } from '../../domain/ports/user-repository.port';
import { USER_REPOSITORY_TOKEN } from '@shared/tokens/injection-tokens';
import {
  UserNotificationProfileService,
  UserWithNotificationProfile,
} from './user-notification-profile.service';

@Injectable()
export class GetUserByIdService {
  constructor(
    @Inject(USER_REPOSITORY_TOKEN)
    private readonly userRepository: IUserRepository,
    private readonly userNotificationProfileService: UserNotificationProfileService,
  ) {}

  async execute(userId: string): Promise<UserWithNotificationProfile> {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new Error('User not found');
    }

    return this.userNotificationProfileService.attachProfile(user);
  }
}
