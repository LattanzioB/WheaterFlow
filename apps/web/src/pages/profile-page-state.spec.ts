import type { TelegramLinkCode, UserProfile } from '../api/types';
import {
  buildLinkCommand,
  describeBotDestination,
  getTelegramChannelStatus,
  isLinkCodeExpired,
} from './profile-page-state';

function deliveryChannels(
  overrides: Partial<UserProfile['deliveryChannels']> = {},
): UserProfile['deliveryChannels'] {
  return {
    telegram: { chatId: null },
    log: { enabled: true },
    inApp: true,
    ...overrides,
  };
}

function linkCode(
  overrides: Partial<TelegramLinkCode> = {},
): TelegramLinkCode {
  return {
    code: 'WF-A1B2C3D4',
    expiresAt: '2026-07-06T12:10:00.000Z',
    instructions: 'Send /link WF-A1B2C3D4 to the WeatherFlow Telegram bot.',
    botUsername: 'weatherflow_bot',
    botUrl: 'https://t.me/weatherflow_bot',
    ...overrides,
  };
}

describe('profile page state', () => {
  it('reports the telegram channel as linked when a chat id is stored', () => {
    const status = getTelegramChannelStatus(
      deliveryChannels({ telegram: { chatId: '987654321' } }),
    );

    expect(status).toEqual({ linked: true, chatId: '987654321' });
  });

  it('reports the telegram channel as unlinked when the chat id is null', () => {
    const status = getTelegramChannelStatus(deliveryChannels());

    expect(status).toEqual({ linked: false, chatId: null });
  });

  it('detects expired link codes, including the exact expiration instant', () => {
    const code = linkCode({ expiresAt: '2026-07-06T12:10:00.000Z' });

    expect(
      isLinkCodeExpired(code, new Date('2026-07-06T12:09:59.999Z')),
    ).toBe(false);
    expect(isLinkCodeExpired(code, new Date('2026-07-06T12:10:00.000Z'))).toBe(
      true,
    );
    expect(isLinkCodeExpired(code, new Date('2026-07-06T12:30:00.000Z'))).toBe(
      true,
    );
  });

  it('builds the /link command the user must send to the bot', () => {
    expect(buildLinkCommand(linkCode({ code: 'WF-FFFF0000' }))).toBe(
      '/link WF-FFFF0000',
    );
  });

  it('describes the bot destination with the configured username', () => {
    expect(describeBotDestination(linkCode())).toBe('@weatherflow_bot');
  });

  it('falls back to a generic destination when the bot username is missing', () => {
    expect(describeBotDestination(linkCode({ botUsername: undefined }))).toBe(
      'el bot de WeatherFlow',
    );
  });
});
