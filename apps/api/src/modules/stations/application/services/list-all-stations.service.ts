import { Inject, Injectable } from '@nestjs/common';
import type { IStationRepository } from '../../domain/ports/station-repository.port';
import { WeatherStation } from '../../domain/entities/weather-station.entity';
import { STATION_REPOSITORY_TOKEN } from '@shared/tokens/injection-tokens';

@Injectable()
export class ListAllStationsService {
  constructor(
    @Inject(STATION_REPOSITORY_TOKEN)
    private readonly stationRepository: IStationRepository,
  ) {}

  async execute(): Promise<WeatherStation[]> {
    return this.stationRepository.findAll();
  }
}
