import { randomUUID } from 'node:crypto';
import { Inject, Injectable, Logger } from '@nestjs/common';
import type { IMeasurementRepository } from '../../domain/ports/measurement-repository.port';
import type { IStationRepository } from '../../../stations/domain/ports/station-repository.port';
import { Measurement } from '../../domain/entities/measurement.entity';
import type { WeatherStation } from '../../../stations/domain/entities/weather-station.entity';
import type { ClimateAlertDetectedMessage } from '@contracts/measurements/climate-alert-detected.message';
import type { AlertPublisher } from '../ports/alert-publisher.port';
import { Humidity } from '../../domain/value-objects/humidity.value-object';
import { Pressure } from '../../domain/value-objects/pressure.value-object';
import { Temperature } from '../../domain/value-objects/temperature.value-object';
import {
  ALERT_PUBLISHER_TOKEN,
  MEASUREMENT_REPOSITORY_TOKEN,
  STATION_REPOSITORY_TOKEN,
} from '@shared/tokens/injection-tokens';

export interface RecordMeasurementCommand {
  stationId: string;
  temperature: number;
  humidity: number;
  pressure: number;
  reportedAt?: Date;
}

@Injectable()
export class RecordMeasurementService {
  private readonly logger = new Logger(RecordMeasurementService.name);

  constructor(
    @Inject(MEASUREMENT_REPOSITORY_TOKEN)
    private readonly measurementRepository: IMeasurementRepository,
    @Inject(STATION_REPOSITORY_TOKEN)
    private readonly stationRepository: IStationRepository,
    @Inject(ALERT_PUBLISHER_TOKEN)
    private readonly alertPublisher: AlertPublisher,
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
      const message = this.buildClimateAlertDetectedMessage(
        measurement,
        station,
      );

      try {
        await this.alertPublisher.publishClimateAlert(message);
      } catch (error) {
        this.logger.error(
          'Climate alert message could not be published after measurement persistence',
          error instanceof Error ? error.stack : String(error),
        );
      }
    }

    return measurement;
  }

  private buildClimateAlertDetectedMessage(
    measurement: Measurement,
    station: WeatherStation,
  ): ClimateAlertDetectedMessage {
    return {
      messageId: randomUUID(),
      occurredAt: new Date().toISOString(),
      measurementId: measurement.getId(),
      stationId: measurement.getStationId(),
      stationName: station.getName(),
      alertType: measurement.getAlertType(),
      reportedAt: measurement.getReportedAt().toISOString(),
      temperature: measurement.getTemperature().getValue(),
      humidity: measurement.getHumidity().getValue(),
      pressure: measurement.getPressure().getValue(),
    };
  }
}
