import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/infrastructure/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../auth/infrastructure/strategies/jwt.strategy';
import { GetStationByIdService } from '../../../stations/application/services/get-station-by-id.service';
import { AlertType } from '../../domain/value-objects/alert-type.enum';
import { QueryMeasurementsService } from '../../application/services/query-measurements.service';
import { RecordMeasurementService } from '../../application/services/record-measurement.service';
import {
  CreateMeasurementDto,
  MeasurementResponseDto,
  QueryMeasurementsDto,
} from '../dtos/measurement.dto';

type AuthenticatedRequest = Request & { user: AuthenticatedUser };

@Controller('measurements')
@UseGuards(JwtAuthGuard)
@ApiTags('Measurements')
export class MeasurementsController {
  constructor(
    private readonly recordMeasurementService: RecordMeasurementService,
    private readonly queryMeasurementsService: QueryMeasurementsService,
    private readonly getStationByIdService: GetStationByIdService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Record a new measurement for a weather station' })
  @ApiCreatedResponse({
    description: 'The measurement was recorded successfully.',
    type: MeasurementResponseDto,
  })
  @ApiBadRequestResponse({ description: 'The measurement payload is invalid.' })
  @ApiUnauthorizedResponse({ description: 'Authentication is required to access this route.' })
  @ApiForbiddenResponse({
    description: 'Users can only record measurements for their own stations.',
  })
  @ApiNotFoundResponse({ description: 'The weather station could not be found.' })
  async create(
    @Body() dto: CreateMeasurementDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<MeasurementResponseDto> {
    try {
      const station = await this.getStationByIdService.execute({
        stationId: dto.stationId,
      });

      if (station.getOwnerId() !== req.user.userId) {
        throw new ForbiddenException('You can only record measurements for your own stations');
      }

      const measurement = await this.recordMeasurementService.execute({
        stationId: dto.stationId,
        temperature: dto.temperature,
        humidity: dto.humidity,
        pressure: dto.pressure,
        reportedAt: dto.reportedAt ? new Date(dto.reportedAt) : undefined,
      });

      return this.toResponse(measurement);
    } catch (error) {
      throw this.mapDomainError(error);
    }
  }

  @Get()
  @ApiOperation({ summary: 'Query measurements using optional filter criteria' })
  @ApiOkResponse({
    description: 'Measurements were retrieved successfully.',
    type: MeasurementResponseDto,
    isArray: true,
  })
  @ApiBadRequestResponse({ description: 'The measurement query parameters are invalid.' })
  @ApiUnauthorizedResponse({ description: 'Authentication is required to access this route.' })
  async query(@Query() dto: QueryMeasurementsDto): Promise<MeasurementResponseDto[]> {
    try {
      const measurements = await this.queryMeasurementsService.execute({
        stationName: dto.stationName,
        tempMin: dto.tempMin,
        tempMax: dto.tempMax,
        alertOnly: dto.alertOnly,
      });

      return measurements.map((measurement) => this.toResponse(measurement));
    } catch (error) {
      throw this.mapDomainError(error);
    }
  }

  private mapDomainError(error: unknown): Error {
    if (error instanceof ForbiddenException) {
      return error;
    }

    if (error instanceof Error && error.message === 'Station not found') {
      return new NotFoundException(error.message);
    }

    return new BadRequestException(
      error instanceof Error ? error.message : 'Unable to process measurement request',
    );
  }

  private toResponse(measurement: MeasurementResponseSource): MeasurementResponseDto {
    return {
      id: measurement.getId(),
      stationId: measurement.getStationId(),
      temperature: measurement.getTemperature().getValue(),
      humidity: measurement.getHumidity().getValue(),
      pressure: measurement.getPressure().getValue(),
      reportedAt: measurement.getReportedAt().toISOString(),
      alertStatus: measurement.hasAlert(),
      alertType: measurement.getAlertType(),
    };
  }
}

interface MeasurementResponseSource {
  getId(): string;
  getStationId(): string;
  getTemperature(): {
    getValue(): number;
  };
  getHumidity(): {
    getValue(): number;
  };
  getPressure(): {
    getValue(): number;
  };
  getReportedAt(): Date;
  hasAlert(): boolean;
  getAlertType(): AlertType;
}
