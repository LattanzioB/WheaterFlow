import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('reports the ingestion service as healthy', () => {
    const controller = new HealthController();

    expect(controller.getHealth()).toEqual({
      service: 'ingestion',
      status: 'ok',
    });
  });
});
