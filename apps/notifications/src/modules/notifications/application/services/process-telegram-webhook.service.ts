import { Inject, Injectable } from '@nestjs/common';
import { NOTIFICATION_PROFILE_REPOSITORY_TOKEN } from '@shared/tokens/injection-tokens';
import type { INotificationProfileRepository } from '../../../notification-preferences/domain/ports/notification-profile-repository.port';

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
    @Inject(NOTIFICATION_PROFILE_REPOSITORY_TOKEN)
    private readonly notificationProfileRepository: INotificationProfileRepository,
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
    const profile =
      await this.notificationProfileRepository.findByTelegramLinkCode(linkCode);

    if (!profile) {
      return 'invalid-code';
    }

    if (!profile.hasActiveTelegramLinkCode(linkCode)) {
      return 'expired-code';
    }

    profile.completeTelegramLinking(String(chatId));
    await this.notificationProfileRepository.save(profile);

    return 'linked';
  }
}
