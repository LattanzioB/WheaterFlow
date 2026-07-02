import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  ALERT_PUBLISHER_TOKEN,
  MEASUREMENT_REPOSITORY_TOKEN,
} from '@shared/tokens/injection-tokens';
import { StationsModule } from '../stations/stations.module';
import { GetTemperatureAverageReportService } from './application/services/get-temperature-average-report.service';
import { QueryMeasurementsService } from './application/services/query-measurements.service';
import { RecordMeasurementService } from './application/services/record-measurement.service';
import { RabbitMqAlertPublisherAdapter } from './infrastructure/adapters/rabbitmq-alert-publisher.adapter';
import { MongoMeasurementRepository } from './infrastructure/repositories/mongo-measurement.repository';
import {
  MeasurementPersistenceModel,
  MeasurementSchema,
} from './infrastructure/persistence/measurement.schema';
import { MeasurementsController } from './interface/controllers/measurements.controller';
import { InternalIngestionMeasurementsController } from './interface/controllers/internal-ingestion-measurements.controller';
import { TemperatureAverageReportsController } from './interface/controllers/temperature-average-reports.controller';
import { IngestionSystemTokenGuard } from '../../shared/guards/ingestion-system-token.guard';
import {
  WeatherStationPersistenceModel,
  WeatherStationSchema,
} from '../stations/infrastructure/persistence/weather-station.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: MeasurementPersistenceModel.name,
        schema: MeasurementSchema,
      },
      {
        name: WeatherStationPersistenceModel.name,
        schema: WeatherStationSchema,
      },
    ]),
    StationsModule,
  ],
  controllers: [
    MeasurementsController,
    InternalIngestionMeasurementsController,
    TemperatureAverageReportsController,
  ],
  providers: [
    RecordMeasurementService,
    QueryMeasurementsService,
    GetTemperatureAverageReportService,
    IngestionSystemTokenGuard,
    {
      provide: MEASUREMENT_REPOSITORY_TOKEN,
      useClass: MongoMeasurementRepository,
    },
    {
      provide: ALERT_PUBLISHER_TOKEN,
      useClass: RabbitMqAlertPublisherAdapter,
    },
  ],
  exports: [MEASUREMENT_REPOSITORY_TOKEN],
})
export class MeasurementsModule {}
