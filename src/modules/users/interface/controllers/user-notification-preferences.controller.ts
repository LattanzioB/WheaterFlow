import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { ApiBearerAuth, ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/infrastructure/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../auth/infrastructure/strategies/jwt.strategy';
import { AlertType } from '../../../measurements/domain/value-objects/alert-type.enum';
import { CreateTelegramLinkCodeService } from '../../application/services/create-telegram-link-code.service';
import { GetUserByIdService } from '../../application/services/get-user-by-id.service';
import {
  ListSubscribedStationsService,
  SubscribedStationSummary,
} from '../../application/services/list-subscribed-stations.service';
import { SubscribeToStationAlertsService } from '../../application/services/subscribe-to-station-alerts.service';
import { UnsubscribeFromStationAlertsService } from '../../application/services/unsubscribe-from-station-alerts.service';
import { UpdateDeliveryChannelsService } from '../../application/services/update-delivery-channels.service';
import { UpdateStationAlertPreferencesService } from '../../application/services/update-station-alert-preferences.service';
import { QuerySubscribedStationsDto } from '../dtos/query-subscribed-stations.dto';
import {
  SubscribeToStationAlertsDto,
  UpdateStationAlertPreferencesDto,
} from '../dtos/station-alert-subscription.dto';
import { TelegramLinkCodeResponseDto } from '../dtos/telegram-link-code-response.dto';
import { UpdateDeliveryChannelsDto } from '../dtos/update-delivery-channels.dto';
import { UserResponseDto } from '../dtos/user-response.dto';

type AuthenticatedRequest = Request & { user: AuthenticatedUser };

@ApiBearerAuth('bearer')
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UserNotificationPreferencesController {
  constructor(
    private readonly configService: ConfigService,
    private readonly createTelegramLinkCodeService: CreateTelegramLinkCodeService,
    private readonly getUserByIdService: GetUserByIdService,
    private readonly listSubscribedStationsService: ListSubscribedStationsService,
    private readonly subscribeToStationAlertsService: SubscribeToStationAlertsService,
    private readonly unsubscribeFromStationAlertsService: UnsubscribeFromStationAlertsService,
    private readonly updateStationAlertPreferencesService: UpdateStationAlertPreferencesService,
    private readonly updateDeliveryChannelsService: UpdateDeliveryChannelsService,
  ) {}

  @Get('me')
  @ApiOperation({
    summary: 'Get the authenticated user profile',
  })
  @ApiOkResponse({
    type: UserResponseDto,
  })
  async getCurrentUser(
    @Req() req: AuthenticatedRequest,
  ): Promise<UserResponseDto> {
    try {
      const user = await this.getUserByIdService.execute(req.user.userId);
      return this.toResponse(user);
    } catch (error) {
      throw this.mapDomainError(error);
    }
  }
  @Get(':id/subscriptions')
  async listSubscriptions(
    @Param('id') userId: string,
    @Query() query: QuerySubscribedStationsDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<SubscribedStationResponse[]> {
    this.ensureOwnUserAccess(req.user, userId);

    try {
      const subscriptions = await this.listSubscribedStationsService.execute({
        userId,
        activeAlertOnly: query.activeAlertOnly,
      });

      return subscriptions.map((subscription) =>
        this.toSubscribedStationResponse(subscription),
      );
    } catch (error) {
      throw this.mapDomainError(error);
    }
  }

  @Post(':id/subscriptions/:stationId')
  @ApiOkResponse({
    type: UserResponseDto,
  })
  async subscribe(
    @Param('id') userId: string,
    @Param('stationId') stationId: string,
    @Body() dto: SubscribeToStationAlertsDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<UserResponseDto> {
    this.ensureOwnUserAccess(req.user, userId);

    try {
      const user = await this.subscribeToStationAlertsService.execute({
        userId,
        stationId,
        alertTypes: dto.alertTypes,
      });

      return this.toResponse(user);
    } catch (error) {
      throw this.mapDomainError(error);
    }
  }

  @Delete(':id/subscriptions/:stationId')
  @ApiOkResponse({
    type: UserResponseDto,
  })
  async unsubscribe(
    @Param('id') userId: string,
    @Param('stationId') stationId: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<UserResponseDto> {
    this.ensureOwnUserAccess(req.user, userId);

    try {
      const user = await this.unsubscribeFromStationAlertsService.execute({
        userId,
        stationId,
      });

      return this.toResponse(user);
    } catch (error) {
      throw this.mapDomainError(error);
    }
  }

  @Patch(':id/subscriptions/:stationId')
  @ApiOkResponse({
    type: UserResponseDto,
  })
  async updateAlertPreferences(
    @Param('id') userId: string,
    @Param('stationId') stationId: string,
    @Body() dto: UpdateStationAlertPreferencesDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<UserResponseDto> {
    this.ensureOwnUserAccess(req.user, userId);

    try {
      const user = await this.updateStationAlertPreferencesService.execute({
        userId,
        stationId,
        alertTypes: dto.alertTypes,
      });

      return this.toResponse(user);
    } catch (error) {
      throw this.mapDomainError(error);
    }
  }

  @Patch(':id/delivery-channels')
  @ApiOkResponse({
    type: UserResponseDto,
  })
  async updateDeliveryChannels(
    @Param('id') userId: string,
    @Body() dto: UpdateDeliveryChannelsDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<UserResponseDto> {
    this.ensureOwnUserAccess(req.user, userId);

    try {
      const user = await this.updateDeliveryChannelsService.execute({
        userId,
        deliveryChannels: dto.deliveryChannels,
      });

      return this.toResponse(user);
    } catch (error) {
      throw this.mapDomainError(error);
    }
  }

  @Post(':id/delivery-channels/telegram/link-code')
  @ApiOperation({
    summary:
      'Create a short-lived Telegram link code for the authenticated user',
  })
  @ApiOkResponse({
    type: TelegramLinkCodeResponseDto,
  })
  async createTelegramLinkCode(
    @Param('id') userId: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<TelegramLinkCodeResponseDto> {
    this.ensureOwnUserAccess(req.user, userId);

    try {
      const result = await this.createTelegramLinkCodeService.execute({
        userId,
      });
      const botUsername =
        this.configService.get<string>('telegram.botUsername')?.trim() ||
        undefined;

      return {
        code: result.code,
        expiresAt: result.expiresAt.toISOString(),
        instructions: `Send /link ${result.code} to the WeatherFlow Telegram bot.`,
        botUsername,
        botUrl: botUsername ? `https://t.me/${botUsername}` : undefined,
      };
    } catch (error) {
      throw this.mapDomainError(error);
    }
  }

  private ensureOwnUserAccess(
    requestUser: AuthenticatedUser,
    userId: string,
  ): void {
    if (requestUser.userId !== userId) {
      throw new ForbiddenException(
        'You can only manage your own notification settings',
      );
    }
  }

  private mapDomainError(error: unknown): Error {
    if (!(error instanceof Error)) {
      return new BadRequestException('Unable to process notification settings');
    }

    if (
      error.message === 'User not found' ||
      error.message === 'Station not found' ||
      error.message === 'User is not subscribed to the station'
    ) {
      return new NotFoundException(error.message);
    }

    return new BadRequestException(error.message);
  }

  private toResponse(user: UserResponseSource): UserResponseDto {
    return {
      id: user.getId(),
      name: user.getName(),
      lastName: user.getLastName(),
      email: user.getEmail().getValue(),
      notificationPreferences: user.getNotificationPreferences(),
      deliveryChannels: user.getDeliveryChannels(),
      createdAt: user.getCreatedAt().toISOString(),
    };
  }

  private toSubscribedStationResponse(
    subscription: SubscribedStationSummary,
  ): SubscribedStationResponse {
    return {
      stationId: subscription.stationId,
      alertTypes: [...subscription.alertTypes],
      hasActiveAlert: subscription.hasActiveAlert,
      station: subscription.station
        ? {
            id: subscription.station.getId(),
            name: subscription.station.getName(),
            location: {
              latitude: subscription.station.getLocation().getLatitude(),
              longitude: subscription.station.getLocation().getLongitude(),
            },
            sensorModel: subscription.station.getSensorModel(),
            status: subscription.station.getStatus(),
            ownerId: subscription.station.getOwnerId(),
            alertSettings: subscription.station
              .getAlertSettings()
              .toPrimitives(),
            createdAt: subscription.station.getCreatedAt().toISOString(),
          }
        : null,
      latestMeasurement: subscription.latestMeasurement
        ? {
            id: subscription.latestMeasurement.getId(),
            stationId: subscription.latestMeasurement.getStationId(),
            temperature: subscription.latestMeasurement
              .getTemperature()
              .getValue(),
            humidity: subscription.latestMeasurement.getHumidity().getValue(),
            pressure: subscription.latestMeasurement.getPressure().getValue(),
            reportedAt: subscription.latestMeasurement
              .getReportedAt()
              .toISOString(),
            alertStatus: subscription.latestMeasurement.hasAlert(),
            alertType: subscription.latestMeasurement.getAlertType(),
          }
        : null,
    };
  }
}

interface UserResponseSource {
  getId(): string;
  getName(): string;
  getLastName(): string;
  getEmail(): { getValue(): string };
  getNotificationPreferences(): Array<{
    stationId: string;
    alertTypes: AlertType[];
  }>;
  getDeliveryChannels(): {
    telegram: {
      chatId: string | null;
    };
  };
  getCreatedAt(): Date;
}

interface SubscribedStationResponse {
  stationId: string;
  alertTypes: AlertType[];
  hasActiveAlert: boolean;
  station: {
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
  } | null;
  latestMeasurement: {
    id: string;
    stationId: string;
    temperature: number;
    humidity: number;
    pressure: number;
    reportedAt: string;
    alertStatus: boolean;
    alertType: AlertType;
  } | null;
}
