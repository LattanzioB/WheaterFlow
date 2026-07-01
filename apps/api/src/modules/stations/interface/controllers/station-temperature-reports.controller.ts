import {
  BadGatewayException,
  Controller,
  Get,
  NotFoundException,
  Param,
  ServiceUnavailableException,
  UnprocessableEntityException,
  UseGuards,
  GatewayTimeoutException,
} from '@nestjs/common';
import {
  ApiBadGatewayResponse,
  ApiBearerAuth,
  ApiGatewayTimeoutResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiServiceUnavailableResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import {
  ApiToIngestionBoundaryError,
  mapApiToIngestionErrorToHttpStatus,
} from '../../../../shared/ingestion/api-to-ingestion-current-weather.client';
import { JwtAuthGuard } from '../../../auth/infrastructure/guards/jwt-auth.guard';
import {
  GetCurrentTemperatureReportService,
  UnsupportedCurrentTemperatureProviderError,
} from '../../application/services/get-current-temperature-report.service';
import { CurrentTemperatureReportDto } from '../dtos/current-temperature-report.dto';

@ApiBearerAuth('bearer')
@Controller('stations/:stationId/reports/temperature')
@UseGuards(JwtAuthGuard)
export class StationTemperatureReportsController {
  constructor(
    private readonly getCurrentTemperatureReportService: GetCurrentTemperatureReportService,
  ) {}

  @Get('current')
  @ApiOkResponse({ type: CurrentTemperatureReportDto })
  @ApiNotFoundResponse({ description: 'Station does not exist.' })
  @ApiUnprocessableEntityResponse({
    description: 'Station is not backed by OpenWeather.',
  })
  @ApiBadGatewayResponse({ description: 'Ingestion returned an invalid result.' })
  @ApiServiceUnavailableResponse({
    description: 'Ingestion is unavailable, saturated, or circuit-open.',
  })
  @ApiGatewayTimeoutResponse({ description: 'Ingestion timed out.' })
  async getCurrentTemperature(
    @Param('stationId') stationId: string,
  ): Promise<CurrentTemperatureReportDto> {
    try {
      return await this.getCurrentTemperatureReportService.execute({
        stationId,
      });
    } catch (error: unknown) {
      throw this.mapError(error);
    }
  }

  private mapError(error: unknown): Error {
    if (error instanceof Error && error.message === 'Station not found') {
      return new NotFoundException('Station not found');
    }

    if (error instanceof UnsupportedCurrentTemperatureProviderError) {
      return new UnprocessableEntityException(
        'Current temperature reports are available only for OpenWeather stations',
      );
    }

    if (error instanceof ApiToIngestionBoundaryError) {
      const status = mapApiToIngestionErrorToHttpStatus(error);
      if (status === 504) {
        return new GatewayTimeoutException('Ingestion service timed out');
      }

      if (status === 503) {
        return new ServiceUnavailableException(
          'Ingestion service is temporarily unavailable',
        );
      }
    }

    return new BadGatewayException('Unable to fetch current weather from ingestion');
  }
}
