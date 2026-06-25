import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { STATION_REPOSITORY_TOKEN } from '@shared/tokens/injection-tokens';
import { UsersModule } from '../users/users.module';
import { CreateStationService } from './application/services/create-station.service';
import { DeleteStationService } from './application/services/delete-station.service';
import { GetStationByIdService } from './application/services/get-station-by-id.service';
import { ListAllStationsService } from './application/services/list-all-stations.service';
import { ListUserStationsService } from './application/services/list-user-stations.service';
import { UpdateStationService } from './application/services/update-station.service';
import { MongoWeatherStationRepository } from './infrastructure/repositories/mongo-weather-station.repository';
import {
  WeatherStationPersistenceModel,
  WeatherStationSchema,
} from './infrastructure/persistence/weather-station.schema';
import { WeatherStationsController } from './interface/controllers/weather-stations.controller';
import { InternalIngestionStationsController } from './interface/controllers/internal-ingestion-stations.controller';
import { IngestionSystemTokenGuard } from '../../shared/guards/ingestion-system-token.guard';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: WeatherStationPersistenceModel.name,
        schema: WeatherStationSchema,
      },
    ]),
    forwardRef(() => UsersModule),
  ],
  controllers: [WeatherStationsController, InternalIngestionStationsController],
  providers: [
    CreateStationService,
    ListUserStationsService,
    ListAllStationsService,
    GetStationByIdService,
    UpdateStationService,
    DeleteStationService,
    IngestionSystemTokenGuard,
    {
      provide: STATION_REPOSITORY_TOKEN,
      useClass: MongoWeatherStationRepository,
    },
  ],
  exports: [STATION_REPOSITORY_TOKEN, GetStationByIdService],
})
export class StationsModule {}
