import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MEASUREMENT_REPOSITORY_TOKEN } from '../../shared/tokens/injection-tokens';
import { StationsModule } from '../stations/stations.module';
import { QueryMeasurementsService } from './application/services/query-measurements.service';
import { RecordMeasurementService } from './application/services/record-measurement.service';
import { MongoMeasurementRepository } from './infrastructure/repositories/mongo-measurement.repository';
import {
  MeasurementPersistenceModel,
  MeasurementSchema,
} from './infrastructure/persistence/measurement.schema';
import { MeasurementsController } from './interface/controllers/measurements.controller';
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
  controllers: [MeasurementsController],
  providers: [
    RecordMeasurementService,
    QueryMeasurementsService,
    {
      provide: MEASUREMENT_REPOSITORY_TOKEN,
      useClass: MongoMeasurementRepository,
    },
  ],
  exports: [MEASUREMENT_REPOSITORY_TOKEN],
})
export class MeasurementsModule {}
