import { Inject, Injectable } from '@nestjs/common';
import {
  NOTIFICATION_SERVICE_CLIENT_TOKEN,
  USER_REPOSITORY_TOKEN,
} from '@shared/tokens/injection-tokens';
import type { INotificationServiceClient } from '../../domain/ports/notification-service-client.port';
import type { IUserRepository } from '../../domain/ports/user-repository.port';

export interface CreateTelegramLinkCodeCommand {
  userId: string;
}

export interface TelegramLinkCodeResult {
  code: string;
  expiresAt: Date;
  instructions: string;
  botUsername?: string;
  botUrl?: string;
}

@Injectable()
export class CreateTelegramLinkCodeService {
  constructor(
    @Inject(USER_REPOSITORY_TOKEN)
    private readonly userRepository: IUserRepository,
    @Inject(NOTIFICATION_SERVICE_CLIENT_TOKEN)
    private readonly notificationServiceClient: INotificationServiceClient,
  ) {}

  async execute(
    command: CreateTelegramLinkCodeCommand,
  ): Promise<TelegramLinkCodeResult> {
    const user = await this.userRepository.findById(command.userId);

    if (!user) {
      throw new Error('User not found');
    }

    const result = await this.notificationServiceClient.createTelegramLinkCode(
      command.userId,
    );

    return {
      code: result.code,
      expiresAt: new Date(result.expiresAt),
      instructions: result.instructions,
      botUsername: result.botUsername,
      botUrl: result.botUrl,
    };
  }
}
