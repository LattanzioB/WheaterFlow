import { Test, TestingModule } from '@nestjs/testing';
import { HttpBoundaryMetrics } from '@shared/resilience/http-boundary.metrics';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService, HttpBoundaryMetrics],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });
  });

  describe('health', () => {
    it('should report the API service as healthy', () => {
      expect(appController.getHealth()).toEqual({
        service: 'api',
        status: 'ok',
      });
    });
  });

  describe('metrics', () => {
    it('renders API boundary metrics', () => {
      expect(appController.getMetrics()).toContain(
        'weatherflow_http_boundary_requests_total{direction="api_to_ingestion",outcome="attempt"} 0',
      );
    });
  });
});
