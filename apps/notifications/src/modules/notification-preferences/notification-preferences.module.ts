import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { NOTIFICATION_PROFILE_REPOSITORY_TOKEN } from '@shared/tokens/injection-tokens';
import { CreateTelegramLinkCodeService } from './application/services/create-telegram-link-code.service';
import { GetNotificationProfileService } from './application/services/get-notification-profile.service';
import { ListAllNotificationProfilesService } from './application/services/list-all-notification-profiles.service';
import { ListNotificationPreferencesService } from './application/services/list-notification-preferences.service';
import { NotificationProfileAccessService } from './application/services/notification-profile-access.service';
import { SubscribeToStationAlertsService } from './application/services/subscribe-to-station-alerts.service';
import { UnsubscribeFromStationAlertsService } from './application/services/unsubscribe-from-station-alerts.service';
import { UpdateDeliveryChannelsService } from './application/services/update-delivery-channels.service';
import { UpdateStationAlertPreferencesService } from './application/services/update-station-alert-preferences.service';
import { MongoNotificationProfileRepository } from './infrastructure/repositories/mongo-notification-profile.repository';
import {
  UserNotificationProfilePersistenceModel,
  UserNotificationProfileSchema,
} from './infrastructure/persistence/user-notification-profile.schema';
import { NotificationPreferencesController } from './interface/controllers/notification-preferences.controller';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('jwt.secret'),
      }),
    }),
    MongooseModule.forFeature([
      {
        name: UserNotificationProfilePersistenceModel.name,
        schema: UserNotificationProfileSchema,
      },
    ]),
  ],
  controllers: [NotificationPreferencesController],
  providers: [
    NotificationProfileAccessService,
    GetNotificationProfileService,
    ListAllNotificationProfilesService,
    ListNotificationPreferencesService,
    SubscribeToStationAlertsService,
    UnsubscribeFromStationAlertsService,
    UpdateStationAlertPreferencesService,
    UpdateDeliveryChannelsService,
    CreateTelegramLinkCodeService,
    {
      provide: NOTIFICATION_PROFILE_REPOSITORY_TOKEN,
      useClass: MongoNotificationProfileRepository,
    },
  ],
  exports: [
    NOTIFICATION_PROFILE_REPOSITORY_TOKEN,
    GetNotificationProfileService,
    SubscribeToStationAlertsService,
    UnsubscribeFromStationAlertsService,
    UpdateStationAlertPreferencesService,
    UpdateDeliveryChannelsService,
    CreateTelegramLinkCodeService,
    NotificationProfileAccessService,
  ],
})
export class NotificationPreferencesModule {}
