import { Inject, Injectable } from '@nestjs/common';
import { IStationRepository } from '../ports/station-repository.port';
import { IUserRepository } from '../../../users/application/ports/user-repository.port';
import { WeatherStation } from '../../domain/entities/weather-station.entity';
import {
  StationAlertSettings,
  StationAlertSettingsProps,
} from '../../domain/value-objects/station-alert-settings.value-object';
import { Location } from '../../domain/value-objects/location.value-object';
import { StationStatus } from '../../domain/value-objects/station-status.enum';
import {
  STATION_REPOSITORY_TOKEN,
  USER_REPOSITORY_TOKEN,
} from '../../../../shared/tokens/injection-tokens';

export interface StationLocationInput {
  latitude: number;
  longitude: number;
}

export interface CreateStationCommand {
  name: string;
  location: StationLocationInput;
  sensorModel: string;
  ownerId: string;
  status?: StationStatus;
  alertSettings?: StationAlertSettingsProps;
}

@Injectable()
export class CreateStationService {
  constructor(
    @Inject(STATION_REPOSITORY_TOKEN)
    private readonly stationRepository: IStationRepository,
    @Inject(USER_REPOSITORY_TOKEN)
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(command: CreateStationCommand): Promise<WeatherStation> {
    const owner = await this.userRepository.findById(command.ownerId);

    if (!owner) {
      throw new Error('Owner user not found');
    }

    const station = WeatherStation.create({
      name: command.name,
      location: Location.create(
        command.location.latitude,
        command.location.longitude,
      ),
      sensorModel: command.sensorModel,
      ownerId: command.ownerId,
      status: command.status,
      alertSettings: command.alertSettings
        ? StationAlertSettings.create(command.alertSettings)
        : undefined,
    });

    await this.stationRepository.save(station);

    return station;
  }
}
