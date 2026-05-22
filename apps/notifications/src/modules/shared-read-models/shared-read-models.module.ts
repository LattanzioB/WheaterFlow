import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MongoMeasurementRepository } from '@api/modules/measurements/infrastructure/repositories/mongo-measurement.repository';
import {
  MeasurementPersistenceModel,
  MeasurementSchema,
} from '@api/modules/measurements/infrastructure/persistence/measurement.schema';
import { MongoWeatherStationRepository } from '@api/modules/stations/infrastructure/repositories/mongo-weather-station.repository';
import {
  WeatherStationPersistenceModel,
  WeatherStationSchema,
} from '@api/modules/stations/infrastructure/persistence/weather-station.schema';
import {
  MEASUREMENT_REPOSITORY_TOKEN,
  STATION_REPOSITORY_TOKEN,
} from '@shared/tokens/injection-tokens';

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
  ],
  providers: [
    {
      provide: STATION_REPOSITORY_TOKEN,
      useClass: MongoWeatherStationRepository,
    },
    {
      provide: MEASUREMENT_REPOSITORY_TOKEN,
      useClass: MongoMeasurementRepository,
    },
  ],
  exports: [STATION_REPOSITORY_TOKEN, MEASUREMENT_REPOSITORY_TOKEN],
})
export class SharedReadModelsModule {}
