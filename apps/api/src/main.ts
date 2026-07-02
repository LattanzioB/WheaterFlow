import './tracing';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';

function resolveCorsOrigins(): string[] {
  const configured = process.env.CORS_ORIGINS?.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (configured && configured.length > 0) {
    return configured;
  }

  return ['http://localhost:5174', 'http://localhost:8080'];
}

function isProductionRuntime(): boolean {
  const nodeEnv = process.env.NODE_ENV?.toLowerCase();
  return nodeEnv === 'production' || nodeEnv === 'prod';
}

/** In dev, allow any localhost port (e.g. alternate Vite port). */
function isAllowedCorsOrigin(
  origin: string | undefined,
  allowedOrigins: string[],
): boolean {
  if (!origin) {
    return true;
  }
  if (allowedOrigins.includes(origin)) {
    return true;
  }
  if (!isProductionRuntime() && /^https?:\/\/localhost(:\d+)?$/.test(origin)) {
    return true;
  }
  return false;
}

type CorsOriginCallback = (err: Error | null, allow?: boolean | string) => void;

function corsOriginDelegate(allowedOrigins: string[]) {
  return (origin: string | undefined, callback: CorsOriginCallback): void => {
    if (isAllowedCorsOrigin(origin, allowedOrigins)) {
      callback(null, origin ?? true);
    } else {
      callback(null, false);
    }
  };
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  const corsOrigins = resolveCorsOrigins();
  app.enableCors({
    origin: corsOriginDelegate(corsOrigins),
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  const swaggerConfig = new DocumentBuilder()
    .setTitle('WeatherFlow API')
    .setDescription(
      'Weather monitoring API for stations, measurements, and alerts.',
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description:
          'Paste the access_token returned by the authentication endpoints.',
      },
      'bearer',
    )
    .addApiKey(
      {
        type: 'apiKey',
        in: 'header',
        name: 'x-ingestion-token',
        description: 'Shared token for internal ingestion service calls.',
      },
      'ingestion-system-token',
    )
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);

  SwaggerModule.setup('api/docs', app, swaggerDocument, {
    jsonDocumentUrl: 'api/docs-json',
  });

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
