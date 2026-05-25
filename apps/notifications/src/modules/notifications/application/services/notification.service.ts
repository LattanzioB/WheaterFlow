import { Inject, Injectable } from '@nestjs/common';
import type { AlertNotifier } from '../../domain/ports/alert-notifier.port';
import type {
  ClimateAlertDetectedMessage,
  MeasurementAlertNotification,
  NotificationDeliveryTarget,
} from '@contracts';
import type { UserNotificationProfile } from '../../../notification-preferences/domain/entities/user-notification-profile.entity';
import type { INotificationProfileRepository } from '../../../notification-preferences/domain/ports/notification-profile-repository.port';
import {
  ALERT_NOTIFIER_TOKEN,
  NOTIFICATION_PROFILE_REPOSITORY_TOKEN,
} from '@shared/tokens/injection-tokens';

@Injectable()
export class NotificationService {
  constructor(
    @Inject(ALERT_NOTIFIER_TOKEN)
    private readonly alertNotifier: AlertNotifier,
    @Inject(NOTIFICATION_PROFILE_REPOSITORY_TOKEN)
    private readonly notificationProfileRepository: INotificationProfileRepository,
  ) {}

  async handleClimateAlert(
    message: ClimateAlertDetectedMessage,
  ): Promise<void> {
    const subscribers =
      await this.notificationProfileRepository.findSubscribersByStationId(
        message.stationId,
      );

    const notifications = subscribers
      .filter((subscriber) =>
        subscriber.isSubscribedToAlert(message.stationId, message.alertType),
      )
      .map((subscriber) => ({
        subscriber,
        deliveryTargets: this.resolveDeliveryTargets(subscriber),
      }))
      .filter(({ deliveryTargets }) => deliveryTargets.length > 0)
      .map<MeasurementAlertNotification>(({ subscriber, deliveryTargets }) => ({
        userId: subscriber.getUserId(),
        deliveryTargets,
        messageId: message.messageId,
        measurementId: message.measurementId,
        stationId: message.stationId,
        stationName: message.stationName,
        alertType: message.alertType,
        reportedAt: new Date(message.reportedAt),
        temperature: message.temperature,
        humidity: message.humidity,
        pressure: message.pressure,
      }));

    for (const notification of notifications) {
      await this.alertNotifier.sendMeasurementAlert(notification);
    }
  }

  private resolveDeliveryTargets(
    profile: UserNotificationProfile,
  ): NotificationDeliveryTarget[] {
    const deliveryChannels = profile.getDeliveryChannels();
    const deliveryTargets: NotificationDeliveryTarget[] = [];

    if (deliveryChannels.telegram.chatId !== null) {
      deliveryTargets.push({
        channel: 'telegram',
        destination: deliveryChannels.telegram.chatId,
      });
    }

    if (deliveryChannels.log?.enabled) {
      deliveryTargets.push({
        channel: 'log',
        destination: profile.getUserId(),
      });
    }

    if (deliveryChannels.inApp) {
      deliveryTargets.push({
        channel: 'in-app',
        destination: profile.getUserId(),
      });
    }

    return deliveryTargets;
  }
}
