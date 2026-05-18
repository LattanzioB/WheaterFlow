import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { MongooseModule } from '@nestjs/mongoose';
import configuration from '@shared/config/configuration';
import { notificationsEnvValidationSchema } from '@shared/config/env-validation';
import { HealthController } from './health.controller';
import { NotificationsModule } from './modules/notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema: notificationsEnvValidationSchema,
      validationOptions: {
        abortEarly: false,
      },
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.getOrThrow<string>('database.uri'),
        retryAttempts: 3,
        retryDelay: 1000,
        lazyConnection: process.env.NODE_ENV === 'test',
      }),
    }),
    EventEmitterModule.forRoot(),
    NotificationsModule,
  ],
  controllers: [HealthController],
})
export class NotificationsAppModule {}
