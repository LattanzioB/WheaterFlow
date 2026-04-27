import { Inject, Injectable } from '@nestjs/common';
import type { IUserRepository } from '../ports/user-repository.port';
import { USER_REPOSITORY_TOKEN } from '../../../../shared/tokens/injection-tokens';
import { User } from '../../domain/entities/user.entity';

@Injectable()
export class GetUserByIdService {
  constructor(
    @Inject(USER_REPOSITORY_TOKEN)
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(userId: string): Promise<User> {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new Error('User not found');
    }

    return user;
  }
}
