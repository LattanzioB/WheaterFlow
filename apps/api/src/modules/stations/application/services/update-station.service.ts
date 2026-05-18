import { Inject, Injectable } from '@nestjs/common';
import type { IStationRepository } from '../../domain/ports/station-repository.port';
import { StationAlertSettingsProps } from '../../domain/value-objects/station-alert-settings.value-object';
import { Location } from '../../domain/value-objects/location.value-object';
import { StationStatus } from '../../domain/value-objects/station-status.enum';
import { WeatherStation } from '../../domain/entities/weather-station.entity';
import { STATION_REPOSITORY_TOKEN } from '@shared/tokens/injection-tokens';
import { StationLocationInput } from './create-station.service';

export interface UpdateStationCommand {
  stationId: string;
  name?: string;
  location?: StationLocationInput;
  sensorModel?: string;
  status?: StationStatus;
  alertSettings?: StationAlertSettingsProps;
}

@Injectable()
export class UpdateStationService {
  constructor(
    @Inject(STATION_REPOSITORY_TOKEN)
    private readonly stationRepository: IStationRepository,
  ) {}

  async execute(command: UpdateStationCommand): Promise<WeatherStation> {
    const station = await this.stationRepository.findById(command.stationId);

    if (!station) {
      throw new Error('Station not found');
    }

    if (command.name !== undefined) {
      station.rename(command.name);
    }

    if (command.location) {
      station.relocate(
        Location.create(command.location.latitude, command.location.longitude),
      );
    }

    if (command.sensorModel !== undefined) {
      station.changeSensorModel(command.sensorModel);
    }

    if (command.status === StationStatus.ACTIVE) {
      station.activate();
    }

    if (command.status === StationStatus.INACTIVE) {
      station.deactivate();
    }

    if (command.alertSettings) {
      station.configureAlerts(command.alertSettings);
    }

    await this.stationRepository.save(station);

    return station;
  }
}
