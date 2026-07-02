import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ObservabilityModule } from '@shared/observability';
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
    ObservabilityModule.forRoot('ingestion'),
    IngestionModule,
  ],
})
export class IngestionAppModule {}
