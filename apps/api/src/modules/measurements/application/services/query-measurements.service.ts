import { Inject, Injectable } from '@nestjs/common';
import type {
  IMeasurementRepository,
  MeasurementFilters,
} from '../../domain/ports/measurement-repository.port';
import { Measurement } from '../../domain/entities/measurement.entity';
import { MEASUREMENT_REPOSITORY_TOKEN } from '@shared/tokens/injection-tokens';

export interface QueryMeasurementsCommand {
  stationName?: string;
  tempMin?: number;
  tempMax?: number;
  humidityMin?: number;
  humidityMax?: number;
  pressureMin?: number;
  pressureMax?: number;
  reportedFrom?: string;
  reportedTo?: string;
  alertOnly?: boolean;
}

@Injectable()
export class QueryMeasurementsService {
  constructor(
    @Inject(MEASUREMENT_REPOSITORY_TOKEN)
    private readonly measurementRepository: IMeasurementRepository,
  ) {}

  async execute(command: QueryMeasurementsCommand): Promise<Measurement[]> {
    this.assertRange(
      command.tempMin,
      command.tempMax,
      'Minimum temperature cannot be greater than maximum temperature',
    );
    this.assertRange(
      command.humidityMin,
      command.humidityMax,
      'Minimum humidity cannot be greater than maximum humidity',
    );
    this.assertRange(
      command.pressureMin,
      command.pressureMax,
      'Minimum pressure cannot be greater than maximum pressure',
    );

    const reportedFrom = this.parseReportedAt(command.reportedFrom);
    const reportedTo = this.parseReportedAt(command.reportedTo);

    if (
      reportedFrom !== undefined &&
      reportedTo !== undefined &&
      reportedFrom.getTime() > reportedTo.getTime()
    ) {
      throw new Error('reportedFrom cannot be later than reportedTo');
    }

    const filters: MeasurementFilters = {
      stationName: command.stationName?.trim() || undefined,
      tempMin: command.tempMin,
      tempMax: command.tempMax,
      humidityMin: command.humidityMin,
      humidityMax: command.humidityMax,
      pressureMin: command.pressureMin,
      pressureMax: command.pressureMax,
      reportedFrom,
      reportedTo,
      alertOnly: command.alertOnly,
    };

    return this.measurementRepository.findWithFilters(filters);
  }

  private assertRange(
    min: number | undefined,
    max: number | undefined,
    message: string,
  ): void {
    if (min !== undefined && max !== undefined && min > max) {
      throw new Error(message);
    }
  }

  private parseReportedAt(value: string | undefined): Date | undefined {
    if (!value?.trim()) {
      return undefined;
    }

    return new Date(value);
  }
}
