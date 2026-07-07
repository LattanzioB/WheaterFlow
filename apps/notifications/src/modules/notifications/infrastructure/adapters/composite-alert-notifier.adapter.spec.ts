import { Logger } from '@nestjs/common';
import { AlertType } from '@contracts';
import { CompositeAlertNotifierAdapter } from './composite-alert-notifier.adapter';
import type { AlertNotifier } from '../../domain/ports/alert-notifier.port';

describe('CompositeAlertNotifierAdapter', () => {
  const notification = {
    userId: 'user-1',
    deliveryTargets: [
      { channel: 'telegram', destination: '123456789' },
      { channel: 'in-app', destination: 'user-1' },
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

  const buildNotifier = () =>
    ({
      sendMeasurementAlert: jest.fn(),
    }) as jest.Mocked<AlertNotifier>;

  it('fans out the complete notification to every registered notifier', async () => {
    const telegramNotifier = buildNotifier();
    const inAppNotifier = buildNotifier();
    const logNotifier = buildNotifier();
    const adapter = new CompositeAlertNotifierAdapter([
      telegramNotifier,
      inAppNotifier,
      logNotifier,
    ]);

    await adapter.sendMeasurementAlert(notification);

    expect(telegramNotifier.sendMeasurementAlert).toHaveBeenCalledWith(
      notification,
    );
    expect(inAppNotifier.sendMeasurementAlert).toHaveBeenCalledWith(
      notification,
    );
    expect(logNotifier.sendMeasurementAlert).toHaveBeenCalledWith(notification);
  });

  it('continues fan-out when one notifier throws', async () => {
    const loggerSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation();
    const telegramNotifier = buildNotifier();
    const inAppNotifier = buildNotifier();
    const adapter = new CompositeAlertNotifierAdapter([
      telegramNotifier,
      inAppNotifier,
    ]);

    telegramNotifier.sendMeasurementAlert.mockRejectedValue(
      new Error('telegram failed'),
    );

    await expect(
      adapter.sendMeasurementAlert(notification),
    ).resolves.toBeUndefined();
    expect(inAppNotifier.sendMeasurementAlert).toHaveBeenCalledWith(
      notification,
    );
    loggerSpy.mockRestore();
  });
});
