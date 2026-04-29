import { Inject, Injectable } from '@nestjs/common';
import type { IStationRepository } from '../../domain/ports/station-repository.port';
import { WeatherStation } from '../../domain/entities/weather-station.entity';
import { STATION_REPOSITORY_TOKEN } from '../../../../shared/tokens/injection-tokens';

export interface GetStationByIdCommand {
  stationId: string;
}

@Injectable()
export class GetStationByIdService {
  constructor(
    @Inject(STATION_REPOSITORY_TOKEN)
    private readonly stationRepository: IStationRepository,
  ) {}

  async execute(command: GetStationByIdCommand): Promise<WeatherStation> {
    const station = await this.stationRepository.findById(command.stationId);

    if (!station) {
      throw new Error('Station not found');
    }

    return station;
  }
}
