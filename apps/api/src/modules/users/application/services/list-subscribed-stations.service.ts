import { Inject, Injectable } from '@nestjs/common';
import { AlertType } from '../../../measurements/domain/value-objects/alert-type.enum';
import type { IMeasurementRepository } from '../../../measurements/domain/ports/measurement-repository.port';
import { Measurement } from '../../../measurements/domain/entities/measurement.entity';
import type { IStationRepository } from '../../../stations/domain/ports/station-repository.port';
import { WeatherStation } from '../../../stations/domain/entities/weather-station.entity';
import {
  MEASUREMENT_REPOSITORY_TOKEN,
  STATION_REPOSITORY_TOKEN,
  USER_REPOSITORY_TOKEN,
} from '@shared/tokens/injection-tokens';
import type { IUserRepository } from '../../domain/ports/user-repository.port';

export interface ListSubscribedStationsCommand {
  userId: string;
  activeAlertOnly?: boolean;
}

export interface SubscribedStationSummary {
  stationId: string;
  alertTypes: AlertType[];
  station: WeatherStation | null;
  latestMeasurement: Measurement | null;
  hasActiveAlert: boolean;
}

@Injectable()
export class ListSubscribedStationsService {
  constructor(
    @Inject(USER_REPOSITORY_TOKEN)
    private readonly userRepository: IUserRepository,
    @Inject(STATION_REPOSITORY_TOKEN)
    private readonly stationRepository: IStationRepository,
    @Inject(MEASUREMENT_REPOSITORY_TOKEN)
    private readonly measurementRepository: IMeasurementRepository,
  ) {}

  async execute(
    command: ListSubscribedStationsCommand,
  ): Promise<SubscribedStationSummary[]> {
    const userId = command.userId.trim();

    if (!userId) {
      throw new Error('User id cannot be empty');
    }

    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new Error('User not found');
    }

    const preferences = user.getNotificationPreferences();

    if (preferences.length === 0) {
      return [];
    }

    const stationIds = [
      ...new Set(preferences.map((preference) => preference.stationId)),
    ];
    const [stations, latestMeasurements] = await Promise.all([
      this.stationRepository.findByIds(stationIds),
      this.measurementRepository.findLatestByStationIds(stationIds),
    ]);
    const stationById = new Map(
      stations.map((station) => [station.getId(), station]),
    );
    const latestMeasurementByStationId = new Map(
      latestMeasurements.map((measurement) => [
        measurement.getStationId(),
        measurement,
      ]),
    );

    return preferences
      .map((preference) => {
        const latestMeasurement =
          latestMeasurementByStationId.get(preference.stationId) ?? null;

        return {
          stationId: preference.stationId,
          alertTypes: [...preference.alertTypes],
          station: stationById.get(preference.stationId) ?? null,
          latestMeasurement,
          hasActiveAlert: latestMeasurement?.hasAlert() ?? false,
        };
      })
      .filter(
        (subscription) =>
          !command.activeAlertOnly || subscription.hasActiveAlert,
      );
  }
}
