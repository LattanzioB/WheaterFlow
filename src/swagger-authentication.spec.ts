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
import { setupApp, SWAGGER_BEARER_AUTH_NAME } from './setup-app';
import { UserNotificationPreferencesController } from './modules/users/interface/controllers/user-notification-preferences.controller';
import { SubscribeToStationAlertsService } from './modules/users/application/services/subscribe-to-station-alerts.service';
import { UnsubscribeFromStationAlertsService } from './modules/users/application/services/unsubscribe-from-station-alerts.service';
import { UpdateDeliveryChannelsService } from './modules/users/application/services/update-delivery-channels.service';
import { UpdateStationAlertPreferencesService } from './modules/users/application/services/update-station-alert-preferences.service';

describe('Swagger authentication', () => {
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

  it('registers a bearer security scheme in the generated OpenAPI document', () => {
    const securitySchemes = document.components.securitySchemes as Record<
      string,
      { type?: string; scheme?: string; bearerFormat?: string }
    >;

    expect(securitySchemes).toHaveProperty(SWAGGER_BEARER_AUTH_NAME);
    expect(securitySchemes[SWAGGER_BEARER_AUTH_NAME]).toMatchObject({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
    });
  });

  it('applies bearer auth requirements only to protected controllers', () => {
    expect(document.paths['/auth/login'].post.security).toBeUndefined();
    expect(document.paths['/weather-stations'].get.security).toEqual([
      { [SWAGGER_BEARER_AUTH_NAME]: [] },
    ]);
    expect(
      document.paths['/users/{id}/delivery-channels'].patch.security,
    ).toEqual([{ [SWAGGER_BEARER_AUTH_NAME]: [] }]);
    expect(document.paths['/measurements'].post.security).toEqual([
      { [SWAGGER_BEARER_AUTH_NAME]: [] },
    ]);
  });
});
