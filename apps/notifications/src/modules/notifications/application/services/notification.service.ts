import { Inject, Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { AlertNotifier } from '../../domain/ports/alert-notifier.port';
import type {
  MeasurementAlertNotification,
  NotificationDeliveryTarget,
} from '@contracts/notifications/measurement-alert-notification';
import type { IMeasurementRepository } from '@api/modules/measurements/domain/ports/measurement-repository.port';
import { MeasurementAlertDetectedEvent } from '@contracts/measurements/measurement-alert-detected.event';
import type { IStationRepository } from '@api/modules/stations/domain/ports/station-repository.port';
import type { UserNotificationProfile } from '../../../notification-preferences/domain/entities/user-notification-profile.entity';
import type { INotificationProfileRepository } from '../../../notification-preferences/domain/ports/notification-profile-repository.port';
import {
  ALERT_NOTIFIER_TOKEN,
  MEASUREMENT_REPOSITORY_TOKEN,
  NOTIFICATION_PROFILE_REPOSITORY_TOKEN,
  STATION_REPOSITORY_TOKEN,
} from '@shared/tokens/injection-tokens';

@Injectable()
export class NotificationService {
  constructor(
    @Inject(ALERT_NOTIFIER_TOKEN)
    private readonly alertNotifier: AlertNotifier,
    @Inject(MEASUREMENT_REPOSITORY_TOKEN)
    private readonly measurementRepository: IMeasurementRepository,
    @Inject(STATION_REPOSITORY_TOKEN)
    private readonly stationRepository: IStationRepository,
    @Inject(NOTIFICATION_PROFILE_REPOSITORY_TOKEN)
    private readonly notificationProfileRepository: INotificationProfileRepository,
  ) {}

  @OnEvent(MeasurementAlertDetectedEvent.EVENT_NAME)
  async handleAlert(event: MeasurementAlertDetectedEvent): Promise<void> {
    const measurement = await this.measurementRepository.findById(
      event.measurementId,
    );

    if (!measurement) {
      return;
    }

    const station = await this.stationRepository.findById(event.stationId);

    if (!station) {
      return;
    }

    const subscribers =
      await this.notificationProfileRepository.findSubscribersByStationId(
        event.stationId,
      );

    const notifications = subscribers
      .filter((subscriber) =>
        subscriber.isSubscribedToAlert(event.stationId, event.alertType),
      )
      .map((subscriber) => ({
        subscriber,
        deliveryTargets: this.resolveDeliveryTargets(subscriber),
      }))
      .filter(({ deliveryTargets }) => deliveryTargets.length > 0)
      .map<MeasurementAlertNotification>(({ subscriber, deliveryTargets }) => ({
        userId: subscriber.getUserId(),
        deliveryTargets,
        measurementId: measurement.getId(),
        stationId: station.getId(),
        stationName: station.getName(),
        alertType: event.alertType,
        reportedAt: measurement.getReportedAt(),
        temperature: measurement.getTemperature().getValue(),
        humidity: measurement.getHumidity().getValue(),
        pressure: measurement.getPressure().getValue(),
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

    return deliveryTargets;
  }
}
