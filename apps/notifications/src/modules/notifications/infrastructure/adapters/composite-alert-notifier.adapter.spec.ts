import { ConfigService } from '@nestjs/config';
import { AlertType } from '@contracts';
import { CompositeAlertNotifierAdapter } from './composite-alert-notifier.adapter';
import { InAppAlertNotifierAdapter } from './in-app-alert-notifier.adapter';
import { LogAlertNotifierAdapter } from './log-alert-notifier.adapter';
import { TelegramAlertNotifierAdapter } from './telegram-alert-notifier.adapter';

describe('CompositeAlertNotifierAdapter', () => {
  const notification = {
    userId: 'user-1',
    deliveryTargets: [{ channel: 'in-app', destination: 'user-1' }],
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

  const buildNotifier = <T extends object>() =>
    ({
      sendMeasurementAlert: jest.fn(),
    }) as unknown as jest.Mocked<T & { sendMeasurementAlert: jest.Mock }>;

  it('runs Telegram delivery and in-app persistence in telegram mode', async () => {
    const configService = {
      get: jest.fn().mockReturnValue('telegram'),
    } as unknown as jest.Mocked<ConfigService>;
    const logNotifier = buildNotifier<LogAlertNotifierAdapter>();
    const telegramNotifier = buildNotifier<TelegramAlertNotifierAdapter>();
    const inAppNotifier = buildNotifier<InAppAlertNotifierAdapter>();
    const adapter = new CompositeAlertNotifierAdapter(
      configService,
      logNotifier,
      telegramNotifier,
      inAppNotifier,
    );

    await adapter.sendMeasurementAlert(notification);

    expect(telegramNotifier.sendMeasurementAlert).toHaveBeenCalledWith(
      notification,
    );
    expect(inAppNotifier.sendMeasurementAlert).toHaveBeenCalledWith(
      notification,
    );
    expect(logNotifier.sendMeasurementAlert).not.toHaveBeenCalled();
  });

  it('continues fan-out when one notifier throws', async () => {
    const configService = {
      get: jest.fn().mockReturnValue('telegram'),
    } as unknown as jest.Mocked<ConfigService>;
    const logNotifier = buildNotifier<LogAlertNotifierAdapter>();
    const telegramNotifier = buildNotifier<TelegramAlertNotifierAdapter>();
    const inAppNotifier = buildNotifier<InAppAlertNotifierAdapter>();
    const adapter = new CompositeAlertNotifierAdapter(
      configService,
      logNotifier,
      telegramNotifier,
      inAppNotifier,
    );

    telegramNotifier.sendMeasurementAlert.mockRejectedValue(
      new Error('telegram failed'),
    );

    await expect(
      adapter.sendMeasurementAlert(notification),
    ).resolves.toBeUndefined();
    expect(inAppNotifier.sendMeasurementAlert).toHaveBeenCalledWith(
      notification,
    );
  });
});
