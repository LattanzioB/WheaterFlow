import { Inject, Injectable } from '@nestjs/common';
import { USER_REPOSITORY_TOKEN } from '@shared/tokens/injection-tokens';
import type { IUserRepository } from '@api/modules/users/domain/ports/user-repository.port';

export interface TelegramWebhookUpdate {
  message?: {
    text?: string;
    chat?: {
      id?: number | string;
    };
  };
}

export type TelegramWebhookOutcome =
  | 'ignored'
  | 'invalid-code'
  | 'expired-code'
  | 'linked';

@Injectable()
export class ProcessTelegramWebhookService {
  private static readonly LINK_COMMAND_PATTERN =
    /^\/link(?:@\w+)?\s+([A-Z0-9-]+)\s*$/i;

  constructor(
    @Inject(USER_REPOSITORY_TOKEN)
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(
    update: TelegramWebhookUpdate,
  ): Promise<TelegramWebhookOutcome> {
    const text = update.message?.text?.trim();
    const chatId = update.message?.chat?.id;

    if (!text || chatId === undefined) {
      return 'ignored';
    }

    const match = text.match(
      ProcessTelegramWebhookService.LINK_COMMAND_PATTERN,
    );

    if (!match) {
      return 'ignored';
    }

    const linkCode = match[1].toUpperCase();
    const user = await this.userRepository.findByTelegramLinkCode(linkCode);

    if (!user) {
      return 'invalid-code';
    }

    if (!user.hasActiveTelegramLinkCode(linkCode)) {
      return 'expired-code';
    }

    user.completeTelegramLinking(String(chatId));
    await this.userRepository.save(user);

    return 'linked';
  }
}
