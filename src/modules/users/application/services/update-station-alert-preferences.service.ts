import { Inject, Injectable } from '@nestjs/common';
import { AlertType } from '../../../measurements/domain/value-objects/alert-type.enum';
import type { IStationRepository } from '../../../stations/application/ports/station-repository.port';
import {
  STATION_REPOSITORY_TOKEN,
  USER_REPOSITORY_TOKEN,
} from '../../../../shared/tokens/injection-tokens';
import type { IUserRepository } from '../ports/user-repository.port';
import type { User } from '../../domain/entities/user.entity';

export interface UpdateStationAlertPreferencesCommand {
  userId: string;
  stationId: string;
  alertTypes: AlertType[];
}

@Injectable()
export class UpdateStationAlertPreferencesService {
  constructor(
    @Inject(USER_REPOSITORY_TOKEN)
    private readonly userRepository: IUserRepository,
    @Inject(STATION_REPOSITORY_TOKEN)
    private readonly stationRepository: IStationRepository,
  ) {}

  async execute(command: UpdateStationAlertPreferencesCommand): Promise<User> {
    const user = await this.userRepository.findById(command.userId);

    if (!user) {
      throw new Error('User not found');
    }

    const station = await this.stationRepository.findById(command.stationId);

    if (!station) {
      throw new Error('Station not found');
    }

    user.updateAlertTypesForStation(command.stationId, command.alertTypes);
    await this.userRepository.save(user);

    return user;
  }
}
