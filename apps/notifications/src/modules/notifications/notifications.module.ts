import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { ALERT_NOTIFIER_TOKEN } from '@shared/tokens/injection-tokens';
import { NOTIFICATION_REPOSITORY_TOKEN } from '@shared/tokens/injection-tokens';
import { NotificationPreferencesModule } from '../notification-preferences/notification-preferences.module';
import { ListUserNotificationsService } from './application/services/list-user-notifications.service';
import { MarkAllNotificationsReadService } from './application/services/mark-all-notifications-read.service';
import { MarkNotificationReadService } from './application/services/mark-notification-read.service';
import { NotificationService } from './application/services/notification.service';
import { ProcessTelegramWebhookService } from './application/services/process-telegram-webhook.service';
import { CompositeAlertNotifierAdapter } from './infrastructure/adapters/composite-alert-notifier.adapter';
import { InAppAlertNotifierAdapter } from './infrastructure/adapters/in-app-alert-notifier.adapter';
import { LogAlertNotifierAdapter } from './infrastructure/adapters/log-alert-notifier.adapter';
import { RabbitMqClimateAlertConsumerAdapter } from './infrastructure/adapters/rabbitmq-climate-alert-consumer.adapter';
import { TelegramAlertNotifierAdapter } from './infrastructure/adapters/telegram-alert-notifier.adapter';
import {
  NotificationPersistenceModel,
  NotificationSchema,
} from './infrastructure/persistence/notification.schema';
import { MongoNotificationRepository } from './infrastructure/repositories/mongo-notification.repository';
import { NotificationStreamController } from './interface/controllers/notification-stream.controller';
import { NotificationsController } from './interface/controllers/notifications.controller';
import { TelegramWebhookController } from './interface/controllers/telegram-webhook.controller';

@Module({
  imports: [
    NotificationPreferencesModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('jwt.secret'),
      }),
    }),
    MongooseModule.forFeature([
      {
        name: NotificationPersistenceModel.name,
        schema: NotificationSchema,
      },
    ]),
  ],
  controllers: [
    TelegramWebhookController,
    NotificationsController,
    NotificationStreamController,
  ],
  providers: [
    ListUserNotificationsService,
    MarkNotificationReadService,
    MarkAllNotificationsReadService,
    NotificationService,
    ProcessTelegramWebhookService,
    RabbitMqClimateAlertConsumerAdapter,
    LogAlertNotifierAdapter,
    TelegramAlertNotifierAdapter,
    InAppAlertNotifierAdapter,
    {
      provide: NOTIFICATION_REPOSITORY_TOKEN,
      useClass: MongoNotificationRepository,
    },
    {
      provide: ALERT_NOTIFIER_TOKEN,
      useClass: CompositeAlertNotifierAdapter,
    },
  ],
})
export class NotificationsModule {}
