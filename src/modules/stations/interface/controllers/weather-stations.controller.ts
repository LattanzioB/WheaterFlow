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
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/infrastructure/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../auth/infrastructure/strategies/jwt.strategy';
import { SWAGGER_BEARER_AUTH_NAME } from '../../../../setup-app';
import { CreateStationService } from '../../application/services/create-station.service';
import { DeleteStationService } from '../../application/services/delete-station.service';
import { GetStationByIdService } from '../../application/services/get-station-by-id.service';
import { ListUserStationsService } from '../../application/services/list-user-stations.service';
import { UpdateStationService } from '../../application/services/update-station.service';
import { StationStatus } from '../../domain/value-objects/station-status.enum';
import { CreateStationDto, UpdateStationDto } from '../dtos/station.dto';
import { StationResponseDto } from '../dtos/station-response.dto';

type AuthenticatedRequest = Request & { user: AuthenticatedUser };

@Controller('weather-stations')
@UseGuards(JwtAuthGuard)
@ApiTags('Weather Stations')
@ApiBearerAuth(SWAGGER_BEARER_AUTH_NAME)
export class WeatherStationsController {
  constructor(
    private readonly createStationService: CreateStationService,
    private readonly listUserStationsService: ListUserStationsService,
    private readonly getStationByIdService: GetStationByIdService,
    private readonly updateStationService: UpdateStationService,
    private readonly deleteStationService: DeleteStationService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List the weather stations owned by the authenticated user' })
  @ApiOkResponse({
    description: 'Stations were retrieved successfully.',
    type: StationResponseDto,
    isArray: true,
  })
  @ApiUnauthorizedResponse({ description: 'Authentication is required to access this route.' })
  async list(@Req() req: AuthenticatedRequest): Promise<StationResponseDto[]> {
    const stations = await this.listUserStationsService.execute({
      ownerId: req.user.userId,
    });

    return stations.map((station) => this.toResponse(station));
  }

  @Post()
  @ApiOperation({ summary: 'Create a new weather station' })
  @ApiCreatedResponse({
    description: 'The weather station was created successfully.',
    type: StationResponseDto,
  })
  @ApiBadRequestResponse({ description: 'The station payload is invalid.' })
  @ApiUnauthorizedResponse({ description: 'Authentication is required to access this route.' })
  @ApiNotFoundResponse({ description: 'The owner user could not be found.' })
  async create(
    @Body() dto: CreateStationDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<StationResponseDto> {
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
  @ApiOperation({ summary: 'Get a weather station by its identifier' })
  @ApiParam({
    name: 'id',
    description: 'Weather station identifier.',
    example: 'station-1',
  })
  @ApiOkResponse({
    description: 'The weather station was retrieved successfully.',
    type: StationResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Authentication is required to access this route.' })
  @ApiForbiddenResponse({ description: 'Users can only access their own stations.' })
  @ApiNotFoundResponse({ description: 'The weather station could not be found.' })
  async getById(
    @Param('id') stationId: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<StationResponseDto> {
    try {
      const station = await this.getStationByIdService.execute({ stationId });
      this.ensureOwnership(station.getOwnerId(), req.user);

      return this.toResponse(station);
    } catch (error) {
      throw this.mapDomainError(error);
    }
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an existing weather station' })
  @ApiParam({
    name: 'id',
    description: 'Weather station identifier.',
    example: 'station-1',
  })
  @ApiOkResponse({
    description: 'The weather station was updated successfully.',
    type: StationResponseDto,
  })
  @ApiBadRequestResponse({ description: 'The station update payload is invalid.' })
  @ApiUnauthorizedResponse({ description: 'Authentication is required to access this route.' })
  @ApiForbiddenResponse({ description: 'Users can only manage their own stations.' })
  @ApiNotFoundResponse({ description: 'The weather station could not be found.' })
  async update(
    @Param('id') stationId: string,
    @Body() dto: UpdateStationDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<StationResponseDto> {
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
  @ApiOperation({ summary: 'Delete an existing weather station' })
  @ApiParam({
    name: 'id',
    description: 'Weather station identifier.',
    example: 'station-1',
  })
  @ApiNoContentResponse({ description: 'The weather station was deleted successfully.' })
  @ApiUnauthorizedResponse({ description: 'Authentication is required to access this route.' })
  @ApiForbiddenResponse({ description: 'Users can only manage their own stations.' })
  @ApiNotFoundResponse({ description: 'The weather station could not be found.' })
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

  private ensureOwnership(ownerId: string, requestUser: AuthenticatedUser): void {
    if (ownerId !== requestUser.userId) {
      throw new ForbiddenException('You can only manage your own stations');
    }
  }

  private mapDomainError(error: unknown): Error {
    if (!(error instanceof Error)) {
      return new BadRequestException('Unable to process station request');
    }

    if (error.message === 'Station not found' || error.message === 'Owner user not found') {
      return new NotFoundException(error.message);
    }

    if (error instanceof ForbiddenException) {
      return error;
    }

    return new BadRequestException(error.message);
  }

  private toResponse(station: StationResponseSource): StationResponseDto {
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
  getStatus(): StationStatus;
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
