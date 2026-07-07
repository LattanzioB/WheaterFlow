import { AlertType } from '@contracts';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NOTIFICATION_DELIVERED_EVENT } from '../../application/events/notification-delivered.event';
import { INotificationRepository } from '../../domain/ports/notification-repository.port';
import { InAppAlertNotifierAdapter } from './in-app-alert-notifier.adapter';

describe('InAppAlertNotifierAdapter', () => {
  const buildNotificationRepository =
    (): jest.Mocked<INotificationRepository> => ({
      save: jest.fn(),
      findById: jest.fn(),
      findByUserId: jest.fn(),
      findAllPage: jest.fn(),
      countUnread: jest.fn(),
      markRead: jest.fn(),
      markAllRead: jest.fn(),
    });

  const buildEventEmitter = (): jest.Mocked<Pick<EventEmitter2, 'emit'>> => ({
    emit: jest.fn(),
  });

  const notification = {
    userId: 'user-1',
    deliveryTargets: [
      {
        channel: 'in-app',
        destination: 'user-1',
      },
      {
        channel: 'telegram',
        destination: '12345',
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

  it('persists exactly one notification per in-app target', async () => {
    const repository = buildNotificationRepository();
    const eventEmitter = buildEventEmitter();
    const adapter = new InAppAlertNotifierAdapter(
      repository,
      eventEmitter as EventEmitter2,
    );

    await adapter.sendMeasurementAlert(notification);

    expect(repository.save).toHaveBeenCalledTimes(1);
    expect(repository.save.mock.calls[0][0].getUserId()).toBe('user-1');
    expect(repository.save.mock.calls[0][0].getMessageId()).toBe('message-1');
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      NOTIFICATION_DELIVERED_EVENT,
      {
        userId: 'user-1',
        notification: repository.save.mock.calls[0][0],
      },
    );
  });

  it('ignores notifications without in-app targets', async () => {
    const repository = buildNotificationRepository();
    const eventEmitter = buildEventEmitter();
    const adapter = new InAppAlertNotifierAdapter(
      repository,
      eventEmitter as EventEmitter2,
    );

    await adapter.sendMeasurementAlert({
      ...notification,
      deliveryTargets: [{ channel: 'telegram', destination: '12345' }],
    });

    expect(repository.save).not.toHaveBeenCalled();
    expect(eventEmitter.emit).not.toHaveBeenCalled();
  });

  it('isolates repository errors', async () => {
    const repository = buildNotificationRepository();
    const eventEmitter = buildEventEmitter();
    const adapter = new InAppAlertNotifierAdapter(
      repository,
      eventEmitter as EventEmitter2,
    );

    repository.save.mockRejectedValue(new Error('database unavailable'));

    await expect(
      adapter.sendMeasurementAlert(notification),
    ).resolves.toBeUndefined();
    expect(eventEmitter.emit).not.toHaveBeenCalled();
  });
});
