import { Inject, Injectable } from '@nestjs/common';
import type { IStationRepository } from '../../domain/ports/station-repository.port';
import { WeatherStation } from '../../domain/entities/weather-station.entity';
import { STATION_REPOSITORY_TOKEN } from '@shared/tokens/injection-tokens';

export interface ListUserStationsCommand {
  ownerId: string;
  name?: string;
}

@Injectable()
export class ListUserStationsService {
  constructor(
    @Inject(STATION_REPOSITORY_TOKEN)
    private readonly stationRepository: IStationRepository,
  ) {}

  async execute(command: ListUserStationsCommand): Promise<WeatherStation[]> {
    const ownerId = command.ownerId.trim();

    if (!ownerId) {
      throw new Error('Owner id cannot be empty');
    }

    return this.stationRepository.findWithFilters({
      ownerId,
      name: command.name?.trim() || undefined,
    });
  }
}
