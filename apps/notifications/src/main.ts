import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NotificationsAppModule } from './notifications-app.module';

async function bootstrap() {
  const app = await NestFactory.create(NotificationsAppModule);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  await app.listen(process.env.NOTIFICATIONS_PORT ?? 3001);
}

void bootstrap();
