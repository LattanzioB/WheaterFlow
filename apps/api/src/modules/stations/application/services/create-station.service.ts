import { Inject, Injectable } from '@nestjs/common';
import type { IStationRepository } from '../../domain/ports/station-repository.port';
import type { IUserRepository } from '../../../users/domain/ports/user-repository.port';
import { WeatherStation } from '../../domain/entities/weather-station.entity';
import {
  StationAlertSettings,
  StationAlertSettingsProps,
} from '../../domain/value-objects/station-alert-settings.value-object';
import { Location } from '../../domain/value-objects/location.value-object';
import { StationStatus } from '../../domain/value-objects/station-status.enum';
import {
  WeatherProvider,
  WeatherProviderCode,
} from '../../domain/value-objects/weather-provider.value-object';
import {
  STATION_REPOSITORY_TOKEN,
  USER_REPOSITORY_TOKEN,
} from '@shared/tokens/injection-tokens';

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
  provider?: WeatherProviderCode;
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
      provider: WeatherProvider.create(command.provider),
      alertSettings: command.alertSettings
        ? StationAlertSettings.create(command.alertSettings)
        : undefined,
    });

    await this.stationRepository.save(station);

    return station;
  }
}
