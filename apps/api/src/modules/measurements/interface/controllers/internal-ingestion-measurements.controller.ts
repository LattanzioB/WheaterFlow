import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  HttpCode,
  NotFoundException,
  Post,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiOkResponse, ApiSecurity, ApiHeader } from '@nestjs/swagger';
import { IngestionSystemTokenGuard } from '../../../../shared/guards/ingestion-system-token.guard';
import { RecordMeasurementService } from '../../application/services/record-measurement.service';
import { MeasurementSource } from '../../domain/value-objects/measurement-source.enum';
import { MeasurementResponseDto } from '../dtos/measurement.dto';
import { InternalIngestionMeasurementDto } from '../dtos/internal-ingestion-measurement.dto';

export const CORRELATION_ID_HEADER = 'x-correlation-id';

@ApiSecurity('ingestion-system-token')
@Controller('internal/ingestion/measurements')
@UseGuards(IngestionSystemTokenGuard)
export class InternalIngestionMeasurementsController {
  constructor(
    private readonly recordMeasurementService: RecordMeasurementService,
  ) {}

  @Post()
  @HttpCode(200)
  @ApiHeader({
    name: CORRELATION_ID_HEADER,
    required: true,
    description: 'Identifier propagated across ingestion, API, and RabbitMQ',
  })
  @ApiOkResponse({ type: MeasurementResponseDto })
  async create(
    @Body() dto: InternalIngestionMeasurementDto,
    @Headers(CORRELATION_ID_HEADER) correlationId?: string,
  ): Promise<MeasurementResponseDto> {
    if (!correlationId?.trim()) {
      throw new UnauthorizedException('Missing correlation identifier');
    }

    try {
      const measurement = await this.recordMeasurementService.execute({
        stationId: dto.stationId,
        temperature: dto.temperature,
        humidity: dto.humidity,
        pressure: dto.pressure,
        reportedAt: new Date(dto.reportedAt),
        source: MeasurementSource.OPENWEATHER,
        idempotencyKey: dto.idempotencyKey,
        correlationId: correlationId.trim(),
      });

      return {
        id: measurement.getId(),
        stationId: measurement.getStationId(),
        temperature: measurement.getTemperature().getValue(),
        humidity: measurement.getHumidity().getValue(),
        pressure: measurement.getPressure().getValue(),
        reportedAt: measurement.getReportedAt().toISOString(),
        source: measurement.getSource(),
        alertStatus: measurement.hasAlert(),
        alertType: measurement.getAlertType(),
      };
    } catch (error: unknown) {
      if (error instanceof Error && error.message === 'Station not found') {
        throw new NotFoundException(error.message);
      }

      throw new BadRequestException(
        error instanceof Error
          ? error.message
          : 'Unable to record ingestion measurement',
      );
    }
  }
}
