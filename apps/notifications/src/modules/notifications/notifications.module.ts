import { Module } from '@nestjs/common';
import { UsersModule } from '@api/modules/users/users.module';
import { StationsModule } from '@api/modules/stations/stations.module';
import { MeasurementsModule } from '@api/modules/measurements/measurements.module';
import { ALERT_NOTIFIER_TOKEN } from '@shared/tokens/injection-tokens';
import { NotificationService } from './application/services/notification.service';
import { ProcessTelegramWebhookService } from './application/services/process-telegram-webhook.service';
import { TelegramAlertNotifierAdapter } from './infrastructure/adapters/telegram-alert-notifier.adapter';
import { TelegramWebhookController } from './interface/controllers/telegram-webhook.controller';

@Module({
  imports: [UsersModule, StationsModule, MeasurementsModule],
  controllers: [TelegramWebhookController],
  providers: [
    NotificationService,
    ProcessTelegramWebhookService,
    {
      provide: ALERT_NOTIFIER_TOKEN,
      useClass: TelegramAlertNotifierAdapter,
    },
  ],
})
export class NotificationsModule {}
