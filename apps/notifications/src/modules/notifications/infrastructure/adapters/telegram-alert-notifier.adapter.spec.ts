import { ConfigService } from '@nestjs/config';
import { AlertType } from '@contracts';
import { TelegramAlertNotifierAdapter } from './telegram-alert-notifier.adapter';

describe('TelegramAlertNotifierAdapter', () => {
  const notification = {
    userId: 'user-1',
    deliveryTargets: [
      {
        channel: 'telegram',
        destination: '12345',
      },
      {
        channel: 'email',
        destination: 'ignored@example.com',
      },
    ],
    messageId: 'message-1',
    measurementId: 'measurement-1',
    stationId: 'station-1',
    stationName: 'Central',
    alertType: AlertType.STORM,
    reportedAt: new Date('2026-04-25T12:00:00.000Z'),
    temperature: 25,
    humidity: 70,
    pressure: 970,
  };

  it('sends Telegram messages only for telegram delivery targets', async () => {
    const configService = {
      get: jest.fn().mockReturnValue('bot-token'),
    } as unknown as jest.Mocked<ConfigService>;
    const httpClient = {
      post: jest.fn().mockResolvedValue({ ok: true }),
    };
    const adapter = new TelegramAlertNotifierAdapter(configService, httpClient);

    await adapter.sendMeasurementAlert(notification);

    expect(httpClient.post).toHaveBeenCalledTimes(1);
    expect(httpClient.post).toHaveBeenCalledWith(
      'https://api.telegram.org/botbot-token/sendMessage',
      expect.objectContaining({
        chat_id: '12345',
      }),
    );
  });

  it('skips delivery when the Telegram bot token is not configured', async () => {
    const configService = {
      get: jest.fn().mockReturnValue(''),
    } as unknown as jest.Mocked<ConfigService>;
    const httpClient = {
      post: jest.fn(),
    };
    const adapter = new TelegramAlertNotifierAdapter(configService, httpClient);

    await adapter.sendMeasurementAlert(notification);

    expect(httpClient.post).not.toHaveBeenCalled();
  });
});
