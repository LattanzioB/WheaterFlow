import { Logger } from '@nestjs/common';
import { AlertType } from '@contracts';
import { LogAlertNotifierAdapter } from './log-alert-notifier.adapter';

describe('LogAlertNotifierAdapter', () => {
  it('receives and logs local demo alert notifications without external calls', async () => {
    const loggerSpy = jest
      .spyOn(Logger.prototype, 'log')
      .mockImplementation(() => undefined);
    const adapter = new LogAlertNotifierAdapter();

    await adapter.sendMeasurementAlert({
      userId: 'user-1',
      deliveryTargets: [{ channel: 'log', destination: 'user-1' }],
      measurementId: 'measurement-1',
      stationId: 'station-1',
      stationName: 'Central',
      alertType: AlertType.STORM,
      reportedAt: new Date('2026-04-25T17:30:00.000Z'),
      temperature: 25,
      humidity: 92,
      pressure: 970,
    });

    expect(loggerSpy).toHaveBeenCalledWith(
      'Alert for user user-1 at station Central: STORM',
    );

    loggerSpy.mockRestore();
  });
});
