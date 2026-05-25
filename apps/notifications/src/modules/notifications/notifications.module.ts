import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ALERT_NOTIFIER_TOKEN } from '@shared/tokens/injection-tokens';
import { NOTIFICATION_REPOSITORY_TOKEN } from '@shared/tokens/injection-tokens';
import { NotificationPreferencesModule } from '../notification-preferences/notification-preferences.module';
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
import { TelegramWebhookController } from './interface/controllers/telegram-webhook.controller';

@Module({
  imports: [
    NotificationPreferencesModule,
    MongooseModule.forFeature([
      {
        name: NotificationPersistenceModel.name,
        schema: NotificationSchema,
      },
    ]),
  ],
  controllers: [TelegramWebhookController],
  providers: [
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
