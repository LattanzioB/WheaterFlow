import { Inject, Injectable } from '@nestjs/common';
import type { IStationRepository } from '../../domain/ports/station-repository.port';
import { STATION_REPOSITORY_TOKEN } from '../../../../shared/tokens/injection-tokens';

export interface DeleteStationCommand {
  stationId: string;
}

@Injectable()
export class DeleteStationService {
  constructor(
    @Inject(STATION_REPOSITORY_TOKEN)
    private readonly stationRepository: IStationRepository,
  ) {}

  async execute(command: DeleteStationCommand): Promise<void> {
    const station = await this.stationRepository.findById(command.stationId);

    if (!station) {
      throw new Error('Station not found');
    }

    await this.stationRepository.delete(command.stationId);
  }
}
