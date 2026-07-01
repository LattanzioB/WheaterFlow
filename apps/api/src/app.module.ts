import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { MeasurementsModule } from './modules/measurements/measurements.module';
import { StationsModule } from './modules/stations/stations.module';
import { UsersModule } from './modules/users/users.module';
import configuration from '@shared/config/configuration';
import { envValidationSchema } from '@shared/config/env-validation';
import { DefaultStationsBootstrap } from './shared/seeds/default-stations.bootstrap';
import { ApiIngestionModule } from './shared/ingestion/api-ingestion.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema: envValidationSchema,
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
    AuthModule,
    UsersModule,
    StationsModule,
    MeasurementsModule,
    ApiIngestionModule,
  ],
  controllers: [AppController],
  providers: [AppService, DefaultStationsBootstrap],
})
export class AppModule {}
