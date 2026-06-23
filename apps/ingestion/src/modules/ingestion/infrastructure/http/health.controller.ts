import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  getHealth(): { service: 'ingestion'; status: 'ok' } {
    return {
      service: 'ingestion',
      status: 'ok',
    };
  }
}
