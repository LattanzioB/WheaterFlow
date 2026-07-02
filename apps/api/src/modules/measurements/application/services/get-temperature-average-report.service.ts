import { Inject, Injectable } from '@nestjs/common';
import { MEASUREMENT_REPOSITORY_TOKEN } from '@shared/tokens/injection-tokens';
import { GetStationByIdService } from '../../../stations/application/services/get-station-by-id.service';
import type { IMeasurementRepository } from '../../domain/ports/measurement-repository.port';

export type TemperatureAverageWindow = 'daily' | 'weekly';

export interface GetTemperatureAverageReportCommand {
  stationId: string;
  window: TemperatureAverageWindow;
  now?: Date;
}

export interface TemperatureAverageReport {
  station: {
    id: string;
    name: string;
  };
  period: {
    from: string;
    to: string;
  };
  average: {
    value: number | null;
    unit: 'celsius';
  };
  sampleCount: number;
}

const WINDOW_DURATION_MS: Record<TemperatureAverageWindow, number> = {
  daily: 24 * 60 * 60 * 1000,
  weekly: 7 * 24 * 60 * 60 * 1000,
};

@Injectable()
export class GetTemperatureAverageReportService {
  constructor(
    private readonly getStationByIdService: GetStationByIdService,
    @Inject(MEASUREMENT_REPOSITORY_TOKEN)
    private readonly measurementRepository: IMeasurementRepository,
  ) {}

  async execute(
    command: GetTemperatureAverageReportCommand,
  ): Promise<TemperatureAverageReport> {
    const station = await this.getStationByIdService.execute({
      stationId: command.stationId,
    });
    const to = command.now ?? new Date();
    const from = new Date(to.getTime() - WINDOW_DURATION_MS[command.window]);

    const average = await this.measurementRepository.averageTemperatureForPeriod({
      stationId: command.stationId,
      from,
      to,
    });

    return {
      station: {
        id: station.getId(),
        name: station.getName(),
      },
      period: {
        from: from.toISOString(),
        to: to.toISOString(),
      },
      average: {
        value: average.average,
        unit: 'celsius',
      },
      sampleCount: average.sampleCount,
    };
  }
}
