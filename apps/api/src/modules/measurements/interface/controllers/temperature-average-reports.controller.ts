import {
  Controller,
  Get,
  NotFoundException,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import {
  GetTemperatureAverageReportService,
  TemperatureAverageWindow,
} from '../../application/services/get-temperature-average-report.service';
import { JwtAuthGuard } from '../../../auth/infrastructure/guards/jwt-auth.guard';
import { TemperatureAverageReportDto } from '../dtos/temperature-average-report.dto';

@ApiTags('Reports')
@ApiBearerAuth('bearer')
@Controller('stations/:stationId/reports/temperature')
@UseGuards(JwtAuthGuard)
export class TemperatureAverageReportsController {
  constructor(
    private readonly getTemperatureAverageReportService: GetTemperatureAverageReportService,
  ) {}

  @Get('daily-average')
  @ApiOperation({
    summary:
      'Get the moving 24 hour average temperature from persisted measurements.',
  })
  @ApiOkResponse({ type: TemperatureAverageReportDto })
  @ApiNotFoundResponse({ description: 'Station does not exist.' })
  getDailyAverage(
    @Param('stationId') stationId: string,
  ): Promise<TemperatureAverageReportDto> {
    return this.getAverage(stationId, 'daily');
  }

  @Get('weekly-average')
  @ApiOperation({
    summary:
      'Get the moving 7 day average temperature from persisted measurements.',
  })
  @ApiOkResponse({ type: TemperatureAverageReportDto })
  @ApiNotFoundResponse({ description: 'Station does not exist.' })
  getWeeklyAverage(
    @Param('stationId') stationId: string,
  ): Promise<TemperatureAverageReportDto> {
    return this.getAverage(stationId, 'weekly');
  }

  private async getAverage(
    stationId: string,
    window: TemperatureAverageWindow,
  ): Promise<TemperatureAverageReportDto> {
    try {
      return await this.getTemperatureAverageReportService.execute({
        stationId,
        window,
      });
    } catch (error: unknown) {
      if (error instanceof Error && error.message === 'Station not found') {
        throw new NotFoundException('Station not found');
      }

      throw error;
    }
  }
}
