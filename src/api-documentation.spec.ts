import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AuthController } from './modules/auth/interface/controllers/auth.controller';
import { LoginUserService } from './modules/auth/application/services/login-user.service';
import { RegisterUserService } from './modules/auth/application/services/register-user.service';
import { MeasurementsController } from './modules/measurements/interface/controllers/measurements.controller';
import { QueryMeasurementsService } from './modules/measurements/application/services/query-measurements.service';
import { RecordMeasurementService } from './modules/measurements/application/services/record-measurement.service';
import { WeatherStationsController } from './modules/stations/interface/controllers/weather-stations.controller';
import { CreateStationService } from './modules/stations/application/services/create-station.service';
import { DeleteStationService } from './modules/stations/application/services/delete-station.service';
import { GetStationByIdService } from './modules/stations/application/services/get-station-by-id.service';
import { ListUserStationsService } from './modules/stations/application/services/list-user-stations.service';
import { UpdateStationService } from './modules/stations/application/services/update-station.service';
import { setupApp } from './setup-app';
import { UserNotificationPreferencesController } from './modules/users/interface/controllers/user-notification-preferences.controller';
import { SubscribeToStationAlertsService } from './modules/users/application/services/subscribe-to-station-alerts.service';
import { UnsubscribeFromStationAlertsService } from './modules/users/application/services/unsubscribe-from-station-alerts.service';
import { UpdateDeliveryChannelsService } from './modules/users/application/services/update-delivery-channels.service';
import { UpdateStationAlertPreferencesService } from './modules/users/application/services/update-station-alert-preferences.service';

jest.setTimeout(20000);

describe('OpenAPI documentation', () => {
  let app: INestApplication;
  let document: ReturnType<typeof setupApp>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [
        AuthController,
        UserNotificationPreferencesController,
        WeatherStationsController,
        MeasurementsController,
      ],
      providers: [
        { provide: RegisterUserService, useValue: { execute: jest.fn() } },
        { provide: LoginUserService, useValue: { execute: jest.fn() } },
        {
          provide: SubscribeToStationAlertsService,
          useValue: { execute: jest.fn() },
        },
        {
          provide: UnsubscribeFromStationAlertsService,
          useValue: { execute: jest.fn() },
        },
        {
          provide: UpdateStationAlertPreferencesService,
          useValue: { execute: jest.fn() },
        },
        { provide: UpdateDeliveryChannelsService, useValue: { execute: jest.fn() } },
        { provide: CreateStationService, useValue: { execute: jest.fn() } },
        { provide: ListUserStationsService, useValue: { execute: jest.fn() } },
        { provide: GetStationByIdService, useValue: { execute: jest.fn() } },
        { provide: UpdateStationService, useValue: { execute: jest.fn() } },
        { provide: DeleteStationService, useValue: { execute: jest.fn() } },
        { provide: RecordMeasurementService, useValue: { execute: jest.fn() } },
        { provide: QueryMeasurementsService, useValue: { execute: jest.fn() } },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    document = setupApp(app);
  });

  afterAll(async () => {
    await app.close();
  });

  it('documents authentication and protected endpoints with expected status codes', () => {
    expect(document.paths['/auth/register'].post.responses).toHaveProperty('201');
    expect(document.paths['/auth/login'].post.responses).toHaveProperty('200');
    expect(document.paths['/auth/login'].post.responses).toHaveProperty('401');
    expect(document.paths['/weather-stations/{id}'].get.responses).toHaveProperty(
      '404',
    );
    expect(
      document.paths['/users/{id}/subscriptions/{stationId}'].patch.responses,
    ).toHaveProperty('404');
    expect(document.paths['/measurements'].get.responses).toHaveProperty('200');
  });

  it('documents DTO schemas with descriptions and examples', () => {
    const registerSchema = document.components.schemas.RegisterDto as {
      properties: Record<string, { description?: string; example?: unknown }>;
    };
    const createStationSchema = document.components.schemas.CreateStationDto as {
      properties: Record<string, { description?: string }>;
    };
    const measurementSchema = document.components.schemas.MeasurementResponseDto as {
      properties: Record<string, { description?: string; example?: unknown }>;
    };

    expect(registerSchema.properties.name).toMatchObject({
      description: 'Given name for the new user account.',
      example: 'Bruno',
    });
    expect(registerSchema.properties.deliveryChannels.description).toBe(
      'Channel-specific delivery settings captured during registration.',
    );
    expect(createStationSchema.properties.location.description).toBe(
      'Geographic coordinates where the station is installed.',
    );
    expect(measurementSchema.properties.alertType.description).toBe(
      'Detected alert classification for the measurement.',
    );
  });

  it('documents query parameters and controller tags for the generated spec', () => {
    const queryOperation = document.paths['/measurements'].get;
    const queryParameterNames =
      queryOperation.parameters?.map((parameter) => {
        if ('$ref' in parameter) {
          return parameter.$ref;
        }

        return parameter.name;
      }) ?? [];
    const loginTags = document.paths['/auth/login'].post.tags ?? [];
    const subscriptionTags =
      document.paths['/users/{id}/subscriptions/{stationId}'].post.tags ?? [];
    const stationTags = document.paths['/weather-stations'].get.tags ?? [];
    const measurementTags = document.paths['/measurements'].get.tags ?? [];

    expect(queryParameterNames).toEqual(
      expect.arrayContaining(['stationName', 'tempMin', 'tempMax', 'alertOnly']),
    );
    expect(loginTags).toContain('Auth');
    expect(subscriptionTags).toContain('Users');
    expect(stationTags).toContain('Weather Stations');
    expect(measurementTags).toContain('Measurements');
  });
});
