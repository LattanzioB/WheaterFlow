import { Module } from '@nestjs/common';
import { ALERT_NOTIFIER_TOKEN } from '../../shared/tokens/injection-tokens';
import { MeasurementsModule } from '../measurements/measurements.module';
import { StationsModule } from '../stations/stations.module';
import { UsersModule } from '../users/users.module';
import { NotificationService } from './application/services/notification.service';
import { TelegramAlertNotifierAdapter } from './infrastructure/adapters/telegram-alert-notifier.adapter';

@Module({
  imports: [UsersModule, StationsModule, MeasurementsModule],
  providers: [
    NotificationService,
    {
      provide: ALERT_NOTIFIER_TOKEN,
      useClass: TelegramAlertNotifierAdapter,
    },
  ],
})
export class NotificationsModule {}
