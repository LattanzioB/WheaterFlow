import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { IngestionAppModule } from './ingestion-app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(IngestionAppModule);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  await app.listen(process.env.INGESTION_PORT ?? 3002);
}

void bootstrap();
