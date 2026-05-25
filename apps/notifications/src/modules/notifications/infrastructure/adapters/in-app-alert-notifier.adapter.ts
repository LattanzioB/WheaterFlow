import { randomUUID } from 'crypto';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MeasurementAlertNotification } from '@contracts/notifications/measurement-alert-notification';
import { NOTIFICATION_REPOSITORY_TOKEN } from '@shared/tokens/injection-tokens';
import { NOTIFICATION_DELIVERED_EVENT } from '../../application/events/notification-delivered.event';
import { Notification } from '../../domain/entities/notification.entity';
import { AlertNotifier } from '../../domain/ports/alert-notifier.port';
import type { INotificationRepository } from '../../domain/ports/notification-repository.port';

@Injectable()
export class InAppAlertNotifierAdapter implements AlertNotifier {
  private readonly logger = new Logger(InAppAlertNotifierAdapter.name);

  constructor(
    @Inject(NOTIFICATION_REPOSITORY_TOKEN)
    private readonly notificationRepository: INotificationRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async sendMeasurementAlert(
    notification: MeasurementAlertNotification,
  ): Promise<void> {
    const inAppTargets = notification.deliveryTargets.filter(
      (target) => target.channel === 'in-app',
    );

    for (const target of inAppTargets) {
      try {
        const persistedNotification = Notification.create({
          id: randomUUID(),
          userId: target.destination,
          stationId: notification.stationId,
          stationName: notification.stationName,
          alertType: notification.alertType,
          temperature: notification.temperature,
          humidity: notification.humidity,
          pressure: notification.pressure,
          reportedAt: notification.reportedAt,
          messageId: notification.messageId,
        });

        await this.notificationRepository.save(persistedNotification);
        this.eventEmitter.emit(NOTIFICATION_DELIVERED_EVENT, {
          userId: target.destination,
          notification: persistedNotification,
        });
      } catch (error) {
        this.logger.error(
          `Unable to persist in-app notification for user ${target.destination}`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }
  }
}
