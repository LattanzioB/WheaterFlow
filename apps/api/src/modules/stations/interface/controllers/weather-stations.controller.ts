import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/infrastructure/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../auth/infrastructure/strategies/jwt.strategy';
import { CreateStationService } from '../../application/services/create-station.service';
import { DeleteStationService } from '../../application/services/delete-station.service';
import { GetStationByIdService } from '../../application/services/get-station-by-id.service';
import { ListAllStationsService } from '../../application/services/list-all-stations.service';
import { ListUserStationsService } from '../../application/services/list-user-stations.service';
import { UpdateStationService } from '../../application/services/update-station.service';
import {
  CreateStationDto,
  QueryStationsDto,
  UpdateStationDto,
} from '../dtos/station.dto';

type AuthenticatedRequest = Request & { user: AuthenticatedUser };

@ApiBearerAuth('bearer')
@Controller('weather-stations')
@UseGuards(JwtAuthGuard)
export class WeatherStationsController {
  constructor(
    private readonly createStationService: CreateStationService,
    private readonly listAllStationsService: ListAllStationsService,
    private readonly listUserStationsService: ListUserStationsService,
    private readonly getStationByIdService: GetStationByIdService,
    private readonly updateStationService: UpdateStationService,
    private readonly deleteStationService: DeleteStationService,
  ) {}

  @Get('available')
  async listAvailable(
    @Query() dto: QueryStationsDto,
  ): Promise<StationResponse[]> {
    const stations = await this.listAllStationsService.execute({
      name: dto.name,
    });

    return stations.map((station) => this.toResponse(station));
  }

  @Get()
  async list(
    @Query() dto: QueryStationsDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<StationResponse[]> {
    const stations = await this.listUserStationsService.execute({
      ownerId: req.user.userId,
      name: dto.name,
    });

    return stations.map((station) => this.toResponse(station));
  }

  @Post()
  async create(
    @Body() dto: CreateStationDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<StationResponse> {
    try {
      const station = await this.createStationService.execute({
        name: dto.name,
        location: dto.location,
        sensorModel: dto.sensorModel,
        ownerId: req.user.userId,
        status: dto.status,
        alertSettings: dto.alertSettings,
      });

      return this.toResponse(station);
    } catch (error) {
      throw this.mapDomainError(error);
    }
  }

  @Get(':id')
  async getById(
    @Param('id') stationId: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<StationResponse> {
    try {
      const station = await this.getStationByIdService.execute({ stationId });
      this.ensureOwnership(station.getOwnerId(), req.user);

      return this.toResponse(station);
    } catch (error) {
      throw this.mapDomainError(error);
    }
  }

  @Patch(':id')
  async update(
    @Param('id') stationId: string,
    @Body() dto: UpdateStationDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<StationResponse> {
    try {
      const existingStation = await this.getStationByIdService.execute({
        stationId,
      });
      this.ensureOwnership(existingStation.getOwnerId(), req.user);

      const station = await this.updateStationService.execute({
        stationId,
        name: dto.name,
        location: dto.location,
        sensorModel: dto.sensorModel,
        status: dto.status,
        alertSettings: dto.alertSettings,
      });

      return this.toResponse(station);
    } catch (error) {
      throw this.mapDomainError(error);
    }
  }

  @Delete(':id')
  @HttpCode(204)
  async delete(
    @Param('id') stationId: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<void> {
    try {
      const station = await this.getStationByIdService.execute({ stationId });
      this.ensureOwnership(station.getOwnerId(), req.user);
      await this.deleteStationService.execute({ stationId });
    } catch (error) {
      throw this.mapDomainError(error);
    }
  }

  private ensureOwnership(
    ownerId: string,
    requestUser: AuthenticatedUser,
  ): void {
    if (ownerId !== requestUser.userId) {
      throw new ForbiddenException('You can only manage your own stations');
    }
  }

  private mapDomainError(error: unknown): Error {
    if (!(error instanceof Error)) {
      return new BadRequestException('Unable to process station request');
    }

    if (
      error.message === 'Station not found' ||
      error.message === 'Owner user not found'
    ) {
      return new NotFoundException(error.message);
    }

    if (error instanceof ForbiddenException) {
      return error;
    }

    return new BadRequestException(error.message);
  }

  private toResponse(station: StationResponseSource): StationResponse {
    return {
      id: station.getId(),
      name: station.getName(),
      location: {
        latitude: station.getLocation().getLatitude(),
        longitude: station.getLocation().getLongitude(),
      },
      sensorModel: station.getSensorModel(),
      status: station.getStatus(),
      ownerId: station.getOwnerId(),
      alertSettings: station.getAlertSettings().toPrimitives(),
      createdAt: station.getCreatedAt().toISOString(),
    };
  }
}

interface StationResponseSource {
  getId(): string;
  getName(): string;
  getLocation(): {
    getLatitude(): number;
    getLongitude(): number;
  };
  getSensorModel(): string;
  getStatus(): string;
  getOwnerId(): string;
  getAlertSettings(): {
    toPrimitives(): {
      extremeHeat: boolean;
      frost: boolean;
      storm: boolean;
      criticalHumidity: boolean;
    };
  };
  getCreatedAt(): Date;
}

interface StationResponse {
  id: string;
  name: string;
  location: {
    latitude: number;
    longitude: number;
  };
  sensorModel: string;
  status: string;
  ownerId: string;
  alertSettings: {
    extremeHeat: boolean;
    frost: boolean;
    storm: boolean;
    criticalHumidity: boolean;
  };
  createdAt: string;
}
