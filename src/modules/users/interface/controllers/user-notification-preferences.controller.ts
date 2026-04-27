import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  NotFoundException,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { ApiBearerAuth, ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/infrastructure/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../auth/infrastructure/strategies/jwt.strategy';
import { CreateTelegramLinkCodeService } from '../../application/services/create-telegram-link-code.service';
import { SubscribeToStationAlertsService } from '../../application/services/subscribe-to-station-alerts.service';
import { UnsubscribeFromStationAlertsService } from '../../application/services/unsubscribe-from-station-alerts.service';
import { UpdateDeliveryChannelsService } from '../../application/services/update-delivery-channels.service';
import { UpdateStationAlertPreferencesService } from '../../application/services/update-station-alert-preferences.service';
import {
  SubscribeToStationAlertsDto,
  UpdateStationAlertPreferencesDto,
} from '../dtos/station-alert-subscription.dto';
import { TelegramLinkCodeResponseDto } from '../dtos/telegram-link-code-response.dto';
import { UpdateDeliveryChannelsDto } from '../dtos/update-delivery-channels.dto';

type AuthenticatedRequest = Request & { user: AuthenticatedUser };

@ApiBearerAuth('bearer')
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UserNotificationPreferencesController {
  constructor(
    private readonly configService: ConfigService,
    private readonly createTelegramLinkCodeService: CreateTelegramLinkCodeService,
    private readonly subscribeToStationAlertsService: SubscribeToStationAlertsService,
    private readonly unsubscribeFromStationAlertsService: UnsubscribeFromStationAlertsService,
    private readonly updateStationAlertPreferencesService: UpdateStationAlertPreferencesService,
    private readonly updateDeliveryChannelsService: UpdateDeliveryChannelsService,
  ) {}

  @Post(':id/subscriptions/:stationId')
  async subscribe(
    @Param('id') userId: string,
    @Param('stationId') stationId: string,
    @Body() dto: SubscribeToStationAlertsDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<UserResponse> {
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
  async unsubscribe(
    @Param('id') userId: string,
    @Param('stationId') stationId: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<UserResponse> {
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
  async updateAlertPreferences(
    @Param('id') userId: string,
    @Param('stationId') stationId: string,
    @Body() dto: UpdateStationAlertPreferencesDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<UserResponse> {
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
  async updateDeliveryChannels(
    @Param('id') userId: string,
    @Body() dto: UpdateDeliveryChannelsDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<UserResponse> {
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
    summary: 'Create a short-lived Telegram link code for the authenticated user',
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
        this.configService.get<string>('telegram.botUsername')?.trim() || undefined;

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

  private toResponse(user: UserResponseSource): UserResponse {
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
    alertTypes: string[];
  }>;
  getDeliveryChannels(): {
    telegram: {
      chatId: string | null;
    };
  };
  getCreatedAt(): Date;
}

interface UserResponse {
  id: string;
  name: string;
  lastName: string;
  email: string;
  notificationPreferences: Array<{
    stationId: string;
    alertTypes: string[];
  }>;
  deliveryChannels: {
    telegram: {
      chatId: string | null;
    };
  };
  createdAt: string;
}
