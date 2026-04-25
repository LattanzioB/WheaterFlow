import { Inject, Injectable } from '@nestjs/common';
import type {
  IMeasurementRepository,
  MeasurementFilters,
} from '../ports/measurement-repository.port';
import { Measurement } from '../../domain/entities/measurement.entity';
import { MEASUREMENT_REPOSITORY_TOKEN } from '../../../../shared/tokens/injection-tokens';

export type QueryMeasurementsCommand = MeasurementFilters;

@Injectable()
export class QueryMeasurementsService {
  constructor(
    @Inject(MEASUREMENT_REPOSITORY_TOKEN)
    private readonly measurementRepository: IMeasurementRepository,
  ) {}

  async execute(command: QueryMeasurementsCommand): Promise<Measurement[]> {
    if (
      command.tempMin !== undefined &&
      command.tempMax !== undefined &&
      command.tempMin > command.tempMax
    ) {
      throw new Error(
        'Minimum temperature cannot be greater than maximum temperature',
      );
    }

    const filters: MeasurementFilters = {
      ...command,
      stationName: command.stationName?.trim() || undefined,
    };

    return this.measurementRepository.findWithFilters(filters);
  }
}
