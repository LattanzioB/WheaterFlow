import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { IMeasurementRepository } from '../../domain/ports/measurement-repository.port';
import type { IStationRepository } from '../../../stations/domain/ports/station-repository.port';
import { Measurement } from '../../domain/entities/measurement.entity';
import { MeasurementAlertDetectedEvent } from '../../domain/events/measurement-alert-detected.event';
import { Humidity } from '../../domain/value-objects/humidity.value-object';
import { Pressure } from '../../domain/value-objects/pressure.value-object';
import { Temperature } from '../../domain/value-objects/temperature.value-object';
import {
  MEASUREMENT_REPOSITORY_TOKEN,
  STATION_REPOSITORY_TOKEN,
} from '../../../../shared/tokens/injection-tokens';

export interface RecordMeasurementCommand {
  stationId: string;
  temperature: number;
  humidity: number;
  pressure: number;
  reportedAt?: Date;
}

@Injectable()
export class RecordMeasurementService {
  constructor(
    @Inject(MEASUREMENT_REPOSITORY_TOKEN)
    private readonly measurementRepository: IMeasurementRepository,
    @Inject(STATION_REPOSITORY_TOKEN)
    private readonly stationRepository: IStationRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(command: RecordMeasurementCommand): Promise<Measurement> {
    const station = await this.stationRepository.findById(command.stationId);

    if (!station) {
      throw new Error('Station not found');
    }

    const measurement = Measurement.create({
      stationId: command.stationId,
      temperature: Temperature.create(command.temperature),
      humidity: Humidity.create(command.humidity),
      pressure: Pressure.create(command.pressure),
      reportedAt: command.reportedAt,
      alertSettings: station.getAlertSettings().toPrimitives(),
    });

    await this.measurementRepository.save(measurement);

    if (measurement.hasAlert()) {
      this.eventEmitter.emit(
        MeasurementAlertDetectedEvent.EVENT_NAME,
        new MeasurementAlertDetectedEvent(
          measurement.getId(),
          measurement.getStationId(),
          measurement.getAlertType(),
        ),
      );
    }

    return measurement;
  }
}
