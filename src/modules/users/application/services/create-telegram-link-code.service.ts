import { randomBytes } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { USER_REPOSITORY_TOKEN } from '../../../../shared/tokens/injection-tokens';
import type { IUserRepository } from '../../domain/ports/user-repository.port';

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
    @Inject(USER_REPOSITORY_TOKEN)
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(
    command: CreateTelegramLinkCodeCommand,
  ): Promise<TelegramLinkCodeResult> {
    const user = await this.userRepository.findById(command.userId);

    if (!user) {
      throw new Error('User not found');
    }

    const code = await this.generateUniqueCode();
    const expiresAt = new Date(
      Date.now() + CreateTelegramLinkCodeService.CODE_TTL_MINUTES * 60 * 1000,
    );

    user.startTelegramLinking(code, expiresAt);
    await this.userRepository.save(user);

    return {
      code,
      expiresAt,
    };
  }

  private async generateUniqueCode(): Promise<string> {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const code = `WF-${randomBytes(4).toString('hex').toUpperCase()}`;
      const existingUser =
        await this.userRepository.findByTelegramLinkCode(code);

      if (!existingUser) {
        return code;
      }
    }

    throw new Error('Unable to generate a unique Telegram link code');
  }
}
