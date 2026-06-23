import { NestFactory } from '@nestjs/core';
import { IngestionAppModule } from './ingestion-app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(IngestionAppModule);
  await app.listen(process.env.INGESTION_PORT ?? 3002);
}

void bootstrap();
