import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  getHealth(): { service: 'notifications'; status: 'ok' } {
    return {
      service: 'notifications',
      status: 'ok',
    };
  }
}
