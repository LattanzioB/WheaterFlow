import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { IngestionModule } from './modules/ingestion/ingestion.module';
import ingestionConfiguration from './modules/ingestion/infrastructure/config/ingestion.configuration';
import { ingestionEnvValidationSchema } from './modules/ingestion/infrastructure/config/ingestion-env-validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [ingestionConfiguration],
      validationSchema: ingestionEnvValidationSchema,
      validationOptions: {
        abortEarly: false,
      },
    }),
    IngestionModule,
  ],
})
export class IngestionAppModule {}
