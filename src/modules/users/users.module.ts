import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { USER_REPOSITORY_TOKEN } from '../../shared/tokens/injection-tokens';
import { StationsModule } from '../stations/stations.module';
import { CreateTelegramLinkCodeService } from './application/services/create-telegram-link-code.service';
import { GetUserByIdService } from './application/services/get-user-by-id.service';
import { SubscribeToStationAlertsService } from './application/services/subscribe-to-station-alerts.service';
import { UnsubscribeFromStationAlertsService } from './application/services/unsubscribe-from-station-alerts.service';
import { UpdateDeliveryChannelsService } from './application/services/update-delivery-channels.service';
import { UpdateStationAlertPreferencesService } from './application/services/update-station-alert-preferences.service';
import { MongoUserRepository } from './infrastructure/repositories/mongo-user.repository';
import {
  UserPersistenceModel,
  UserSchema,
} from './infrastructure/persistence/user.schema';
import { UserNotificationPreferencesController } from './interface/controllers/user-notification-preferences.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: UserPersistenceModel.name,
        schema: UserSchema,
      },
    ]),
    forwardRef(() => StationsModule),
  ],
  controllers: [UserNotificationPreferencesController],
  providers: [
    CreateTelegramLinkCodeService,
    GetUserByIdService,
    SubscribeToStationAlertsService,
    UnsubscribeFromStationAlertsService,
    UpdateStationAlertPreferencesService,
    UpdateDeliveryChannelsService,
    {
      provide: USER_REPOSITORY_TOKEN,
      useClass: MongoUserRepository,
    },
  ],
  exports: [USER_REPOSITORY_TOKEN],
})
export class UsersModule {}
