import { Inject, Injectable } from '@nestjs/common';
import type { IStationRepository } from '../../domain/ports/station-repository.port';
import { WeatherStation } from '../../domain/entities/weather-station.entity';
import { WeatherProviderCode } from '../../domain/value-objects/weather-provider.value-object';
import { STATION_REPOSITORY_TOKEN } from '@shared/tokens/injection-tokens';

export interface ListAllStationsCommand {
  name?: string;
  provider?: WeatherProviderCode;
}

@Injectable()
export class ListAllStationsService {
  constructor(
    @Inject(STATION_REPOSITORY_TOKEN)
    private readonly stationRepository: IStationRepository,
  ) {}

  async execute(
    command: ListAllStationsCommand = {},
  ): Promise<WeatherStation[]> {
    return this.stationRepository.findWithFilters({
      name: command.name?.trim() || undefined,
      provider: command.provider,
    });
  }
}
