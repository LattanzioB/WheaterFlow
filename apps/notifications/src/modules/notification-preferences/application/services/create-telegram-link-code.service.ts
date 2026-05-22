import { randomBytes } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { NOTIFICATION_PROFILE_REPOSITORY_TOKEN } from '@shared/tokens/injection-tokens';
import type { INotificationProfileRepository } from '../../domain/ports/notification-profile-repository.port';
import { NotificationProfileAccessService } from './notification-profile-access.service';

export interface CreateTelegramLinkCodeCommand {
  userId: string;
}

export interface TelegramLinkCodeResult {
  code: string;
  expiresAt: Date;
}

@Injectable()
export class CreateTelegramLinkCodeService {
  private static readonly CODE_TTL_MINUTES = 10;

  constructor(
    private readonly profileAccessService: NotificationProfileAccessService,
    @Inject(NOTIFICATION_PROFILE_REPOSITORY_TOKEN)
    private readonly profileRepository: INotificationProfileRepository,
  ) {}

  async execute(
    command: CreateTelegramLinkCodeCommand,
  ): Promise<TelegramLinkCodeResult> {
    const profile = await this.profileAccessService.getOrCreate(command.userId);
    const code = await this.generateUniqueCode();
    const expiresAt = new Date(
      Date.now() + CreateTelegramLinkCodeService.CODE_TTL_MINUTES * 60 * 1000,
    );

    profile.startTelegramLinking(code, expiresAt);
    await this.profileRepository.save(profile);

    return {
      code,
      expiresAt,
    };
  }

  private async generateUniqueCode(): Promise<string> {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const code = `WF-${randomBytes(4).toString('hex').toUpperCase()}`;
      const existingProfile =
        await this.profileRepository.findByTelegramLinkCode(code);

      if (!existingProfile) {
        return code;
      }
    }

    throw new Error('Unable to generate a unique Telegram link code');
  }
}
