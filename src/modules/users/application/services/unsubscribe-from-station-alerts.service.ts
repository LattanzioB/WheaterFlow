import { Inject, Injectable } from '@nestjs/common';
import { USER_REPOSITORY_TOKEN } from '../../../../shared/tokens/injection-tokens';
import { IUserRepository } from '../ports/user-repository.port';
import { User } from '../../domain/entities/user.entity';

export interface UnsubscribeFromStationAlertsCommand {
  userId: string;
  stationId: string;
}

@Injectable()
export class UnsubscribeFromStationAlertsService {
  constructor(
    @Inject(USER_REPOSITORY_TOKEN)
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(command: UnsubscribeFromStationAlertsCommand): Promise<User> {
    const user = await this.userRepository.findById(command.userId);

    if (!user) {
      throw new Error('User not found');
    }

    user.unsubscribeFromAlerts(command.stationId);
    await this.userRepository.save(user);

    return user;
  }
}
