import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { setupApp } from './setup-app';

describe('setupApp', () => {
  let app: INestApplication;

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  it('configures the WeatherFlow OpenAPI document', async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    app = moduleRef.createNestApplication();

    const document = setupApp(app);

    expect(document.info).toMatchObject({
      title: 'WeatherFlow API',
      description:
        'Weather monitoring API for stations, measurements, and alerts.',
      version: '1.0.0',
    });
    expect(document.paths).toHaveProperty('/');
  });
});
