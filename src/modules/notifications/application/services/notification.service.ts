import { Inject, Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AlertNotifier } from '../ports/alert-notifier.port';
import { MeasurementAlertNotification } from '../ports/measurement-alert-notification';
import { IMeasurementRepository } from '../../../measurements/application/ports/measurement-repository.port';
import { MeasurementAlertDetectedEvent } from '../../../measurements/domain/events/measurement-alert-detected.event';
import { IStationRepository } from '../../../stations/application/ports/station-repository.port';
import { IUserRepository } from '../../../users/application/ports/user-repository.port';
import {
  ALERT_NOTIFIER_TOKEN,
  MEASUREMENT_REPOSITORY_TOKEN,
  STATION_REPOSITORY_TOKEN,
  USER_REPOSITORY_TOKEN,
} from '../../../../shared/tokens/injection-tokens';

@Injectable()
export class NotificationService {
  constructor(
    @Inject(ALERT_NOTIFIER_TOKEN)
    private readonly alertNotifier: AlertNotifier,
    @Inject(MEASUREMENT_REPOSITORY_TOKEN)
    private readonly measurementRepository: IMeasurementRepository,
    @Inject(STATION_REPOSITORY_TOKEN)
    private readonly stationRepository: IStationRepository,
    @Inject(USER_REPOSITORY_TOKEN)
    private readonly userRepository: IUserRepository,
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

    const subscribers = await this.userRepository.findSubscribersByStationId(
      event.stationId,
    );

    const notifications = subscribers
      .filter((subscriber) => subscriber.getTelegramChatId() !== null)
      .map<MeasurementAlertNotification>((subscriber) => ({
        userId: subscriber.getId(),
        telegramChatId: subscriber.getTelegramChatId() as string,
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
}
