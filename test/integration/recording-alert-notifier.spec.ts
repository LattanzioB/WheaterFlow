import { AlertType } from '@contracts';
import { RecordingAlertNotifier } from './recording-alert-notifier';

describe('RecordingAlertNotifier', () => {
  it('records notifications and resolves matching waits', async () => {
    const notifier = new RecordingAlertNotifier();
    const wait = notifier.waitForNotification(
      (notification) => notification.stationId === 'station-1',
    );

    await notifier.sendMeasurementAlert({
      userId: 'user-1',
      deliveryTargets: [{ channel: 'log', destination: 'user-1' }],
      measurementId: 'measurement-1',
      stationId: 'station-1',
      stationName: 'North Station',
      alertType: AlertType.EXTREME_HEAT,
      reportedAt: new Date('2026-05-22T10:00:00.000Z'),
      temperature: 42,
      humidity: 50,
      pressure: 1010,
    });

    await expect(wait).resolves.toMatchObject({
      userId: 'user-1',
      stationId: 'station-1',
      alertType: AlertType.EXTREME_HEAT,
    });
    expect(notifier.getNotifications()).toHaveLength(1);
  });

  it('rejects bounded waits when no notification arrives', async () => {
    const notifier = new RecordingAlertNotifier();

    await expect(notifier.waitForNotification(() => true, 1)).rejects.toThrow(
      'Timed out waiting for alert notification',
    );
  });
});
