import type { TelegramLinkCode, UserProfile } from '../api/types';

export type TelegramChannelStatus =
  | { linked: true; chatId: string }
  | { linked: false; chatId: null };

export function getTelegramChannelStatus(
  deliveryChannels: UserProfile['deliveryChannels'],
): TelegramChannelStatus {
  const chatId = deliveryChannels.telegram.chatId;

  if (chatId) {
    return { linked: true, chatId };
  }

  return { linked: false, chatId: null };
}

export function getInAppChannelEnabled(
  deliveryChannels: UserProfile['deliveryChannels'],
): boolean {
  return deliveryChannels.inApp;
}

export function isLinkCodeExpired(
  linkCode: Pick<TelegramLinkCode, 'expiresAt'>,
  now: Date,
): boolean {
  return new Date(linkCode.expiresAt).getTime() <= now.getTime();
}

export function buildLinkCommand(
  linkCode: Pick<TelegramLinkCode, 'code'>,
): string {
  return `/link ${linkCode.code}`;
}

export function describeBotDestination(
  linkCode: Pick<TelegramLinkCode, 'botUsername'>,
): string {
  if (linkCode.botUsername) {
    return `@${linkCode.botUsername}`;
  }

  return 'el bot de WeatherFlow';
}
