import { Module } from '@nestjs/common';
import { ALERT_NOTIFIER_TOKEN } from '@shared/tokens/injection-tokens';
import { NotificationPreferencesModule } from '../notification-preferences/notification-preferences.module';
import { SharedReadModelsModule } from '../shared-read-models/shared-read-models.module';
import { NotificationService } from './application/services/notification.service';
import { ProcessTelegramWebhookService } from './application/services/process-telegram-webhook.service';
import { CompositeAlertNotifierAdapter } from './infrastructure/adapters/composite-alert-notifier.adapter';
import { LogAlertNotifierAdapter } from './infrastructure/adapters/log-alert-notifier.adapter';
import { TelegramAlertNotifierAdapter } from './infrastructure/adapters/telegram-alert-notifier.adapter';
import { TelegramWebhookController } from './interface/controllers/telegram-webhook.controller';

@Module({
  imports: [NotificationPreferencesModule, SharedReadModelsModule],
  controllers: [TelegramWebhookController],
  providers: [
    NotificationService,
    ProcessTelegramWebhookService,
    LogAlertNotifierAdapter,
    TelegramAlertNotifierAdapter,
    {
      provide: ALERT_NOTIFIER_TOKEN,
      useClass: CompositeAlertNotifierAdapter,
    },
  ],
})
export class NotificationsModule {}
