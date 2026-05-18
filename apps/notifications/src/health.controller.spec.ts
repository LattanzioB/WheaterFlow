import { HealthController } from './health.controller';

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(() => {
    controller = new HealthController();
  });

  it('should report the notifications service as healthy', () => {
    expect(controller.getHealth()).toEqual({
      service: 'notifications',
      status: 'ok',
    });
  });
});
