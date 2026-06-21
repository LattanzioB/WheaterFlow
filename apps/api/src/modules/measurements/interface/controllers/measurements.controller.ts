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
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/infrastructure/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../auth/infrastructure/strategies/jwt.strategy';
import { GetStationByIdService } from '../../../stations/application/services/get-station-by-id.service';
import { QueryMeasurementsService } from '../../application/services/query-measurements.service';
import { RecordMeasurementService } from '../../application/services/record-measurement.service';
import {
  CreateMeasurementDto,
  MeasurementResponseDto,
  QueryMeasurementsDto,
} from '../dtos/measurement.dto';
import { MeasurementSource } from '../../domain/value-objects/measurement-source.enum';
import { AlertType } from '../../domain/value-objects/alert-type.enum';

type AuthenticatedRequest = Request & { user: AuthenticatedUser };

@ApiBearerAuth('bearer')
@Controller('measurements')
@UseGuards(JwtAuthGuard)
export class MeasurementsController {
  constructor(
    private readonly recordMeasurementService: RecordMeasurementService,
    private readonly queryMeasurementsService: QueryMeasurementsService,
    private readonly getStationByIdService: GetStationByIdService,
  ) {}

  @Post()
  @ApiCreatedResponse({ type: MeasurementResponseDto })
  async create(
    @Body() dto: CreateMeasurementDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<MeasurementResponseDto> {
    try {
      const station = await this.getStationByIdService.execute({
        stationId: dto.stationId,
      });

      if (station.getOwnerId() !== req.user.userId) {
        throw new ForbiddenException(
          'You can only record measurements for your own stations',
        );
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
  @ApiOkResponse({ type: MeasurementResponseDto, isArray: true })
  async query(
    @Query() dto: QueryMeasurementsDto,
  ): Promise<MeasurementResponseDto[]> {
    try {
      const measurements = await this.queryMeasurementsService.execute({
        stationName: dto.stationName,
        tempMin: dto.tempMin,
        tempMax: dto.tempMax,
        humidityMin: dto.humidityMin,
        humidityMax: dto.humidityMax,
        pressureMin: dto.pressureMin,
        pressureMax: dto.pressureMax,
        reportedFrom: dto.reportedFrom,
        reportedTo: dto.reportedTo,
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
      error instanceof Error
        ? error.message
        : 'Unable to process measurement request',
    );
  }

  private toResponse(
    measurement: MeasurementResponseSource,
  ): MeasurementResponseDto {
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
  getSource(): MeasurementSource;
  hasAlert(): boolean;
  getAlertType(): AlertType;
}
