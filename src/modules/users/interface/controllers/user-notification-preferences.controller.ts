import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
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
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/infrastructure/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../auth/infrastructure/strategies/jwt.strategy';
import { AlertType } from '../../../measurements/domain/value-objects/alert-type.enum';
import { SWAGGER_BEARER_AUTH_NAME } from '../../../../setup-app';
import { SubscribeToStationAlertsService } from '../../application/services/subscribe-to-station-alerts.service';
import { UnsubscribeFromStationAlertsService } from '../../application/services/unsubscribe-from-station-alerts.service';
import { UpdateDeliveryChannelsService } from '../../application/services/update-delivery-channels.service';
import { UpdateStationAlertPreferencesService } from '../../application/services/update-station-alert-preferences.service';
import {
  SubscribeToStationAlertsDto,
  UpdateStationAlertPreferencesDto,
} from '../dtos/station-alert-subscription.dto';
import { UpdateDeliveryChannelsDto } from '../dtos/update-delivery-channels.dto';
import { UserResponseDto } from '../dtos/user-response.dto';

type AuthenticatedRequest = Request & { user: AuthenticatedUser };

@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiTags('Users')
@ApiBearerAuth(SWAGGER_BEARER_AUTH_NAME)
export class UserNotificationPreferencesController {
  constructor(
    private readonly subscribeToStationAlertsService: SubscribeToStationAlertsService,
    private readonly unsubscribeFromStationAlertsService: UnsubscribeFromStationAlertsService,
    private readonly updateStationAlertPreferencesService: UpdateStationAlertPreferencesService,
    private readonly updateDeliveryChannelsService: UpdateDeliveryChannelsService,
  ) {}

  @Post(':id/subscriptions/:stationId')
  @HttpCode(200)
  @ApiOperation({ summary: 'Subscribe a user to alerts for a weather station' })
  @ApiParam({ name: 'id', description: 'User identifier.', example: 'user-1' })
  @ApiParam({
    name: 'stationId',
    description: 'Weather station identifier.',
    example: 'station-1',
  })
  @ApiOkResponse({
    description: 'The user subscription preferences were updated successfully.',
    type: UserResponseDto,
  })
  @ApiBadRequestResponse({ description: 'The subscription payload is invalid.' })
  @ApiUnauthorizedResponse({ description: 'Authentication is required to access this route.' })
  @ApiForbiddenResponse({
    description: 'Users can only manage their own notification settings.',
  })
  @ApiNotFoundResponse({
    description: 'The user or station could not be found.',
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
  @ApiOperation({ summary: 'Remove a station alert subscription from a user' })
  @ApiParam({ name: 'id', description: 'User identifier.', example: 'user-1' })
  @ApiParam({
    name: 'stationId',
    description: 'Weather station identifier.',
    example: 'station-1',
  })
  @ApiOkResponse({
    description: 'The user subscription was removed successfully.',
    type: UserResponseDto,
  })
  @ApiBadRequestResponse({ description: 'The unsubscribe request could not be processed.' })
  @ApiUnauthorizedResponse({ description: 'Authentication is required to access this route.' })
  @ApiForbiddenResponse({
    description: 'Users can only manage their own notification settings.',
  })
  @ApiNotFoundResponse({
    description: 'The user, station, or subscription could not be found.',
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
  @ApiOperation({ summary: 'Replace the alert types selected for a station subscription' })
  @ApiParam({ name: 'id', description: 'User identifier.', example: 'user-1' })
  @ApiParam({
    name: 'stationId',
    description: 'Weather station identifier.',
    example: 'station-1',
  })
  @ApiOkResponse({
    description: 'The station alert preferences were updated successfully.',
    type: UserResponseDto,
  })
  @ApiBadRequestResponse({ description: 'The alert preferences payload is invalid.' })
  @ApiUnauthorizedResponse({ description: 'Authentication is required to access this route.' })
  @ApiForbiddenResponse({
    description: 'Users can only manage their own notification settings.',
  })
  @ApiNotFoundResponse({
    description: 'The user, station, or subscription could not be found.',
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
  @ApiOperation({ summary: 'Update the delivery channels configured for a user' })
  @ApiParam({ name: 'id', description: 'User identifier.', example: 'user-1' })
  @ApiOkResponse({
    description: 'The user delivery channels were updated successfully.',
    type: UserResponseDto,
  })
  @ApiBadRequestResponse({ description: 'The delivery channel payload is invalid.' })
  @ApiUnauthorizedResponse({ description: 'Authentication is required to access this route.' })
  @ApiForbiddenResponse({
    description: 'Users can only manage their own notification settings.',
  })
  @ApiNotFoundResponse({ description: 'The user could not be found.' })
  async updateDeliveryChannels(
    @Param('id') userId: string,
    @Body() dto: UpdateDeliveryChannelsDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<UserResponseDto> {
    this.ensureOwnUserAccess(req.user, userId);

    try {
      const user = await this.updateDeliveryChannelsService.execute({
        userId,
        telegramChatId: dto.deliveryChannels.telegram?.chatId,
      });

      return this.toResponse(user);
    } catch (error) {
      throw this.mapDomainError(error);
    }
  }

  private ensureOwnUserAccess(requestUser: AuthenticatedUser, userId: string): void {
    if (requestUser.userId !== userId) {
      throw new ForbiddenException('You can only manage your own notification settings');
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
