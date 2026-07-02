import './tracing';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { IngestionAppModule } from './ingestion-app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(IngestionAppModule, {
    bufferLogs: true,
  });
  app.useLogger(app.get(Logger));
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
