import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiBearerAuth,
  ApiExcludeEndpoint,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { NotificationJwtAuthGuard } from '../../../notifications/interface/guards/notification-jwt-auth.guard';
import { CreateTelegramLinkCodeService } from '../../application/services/create-telegram-link-code.service';
import { GetNotificationProfileService } from '../../application/services/get-notification-profile.service';
import { ListAllNotificationProfilesService } from '../../application/services/list-all-notification-profiles.service';
import { ListNotificationPreferencesService } from '../../application/services/list-notification-preferences.service';
import { SubscribeToStationAlertsService } from '../../application/services/subscribe-to-station-alerts.service';
import { UnsubscribeFromStationAlertsService } from '../../application/services/unsubscribe-from-station-alerts.service';
import { UpdateDeliveryChannelsService } from '../../application/services/update-delivery-channels.service';
import { UpdateStationAlertPreferencesService } from '../../application/services/update-station-alert-preferences.service';
import {
  NotificationProfileResponseDto,
  NotificationProfilesPageDto,
  QueryNotificationProfilesDto,
  SubscribeToStationAlertsDto,
  TelegramLinkCodeResponseDto,
  UpdateDeliveryChannelsDto,
  UpdateStationAlertPreferencesDto,
} from '../dtos/notification-profile.dto';
import { NotificationProfileResponseMapper } from '../mappers/notification-profile-response.mapper';

@ApiTags('notification-preferences')
@Controller('notification-preferences/users')
export class NotificationPreferencesController {
  constructor(
    private readonly configService: ConfigService,
    private readonly getNotificationProfileService: GetNotificationProfileService,
    private readonly listAllNotificationProfilesService: ListAllNotificationProfilesService,
    private readonly listNotificationPreferencesService: ListNotificationPreferencesService,
    private readonly subscribeToStationAlertsService: SubscribeToStationAlertsService,
    private readonly unsubscribeFromStationAlertsService: UnsubscribeFromStationAlertsService,
    private readonly updateStationAlertPreferencesService: UpdateStationAlertPreferencesService,
    private readonly updateDeliveryChannelsService: UpdateDeliveryChannelsService,
    private readonly createTelegramLinkCodeService: CreateTelegramLinkCodeService,
  ) {}

  @Get()
  @UseGuards(NotificationJwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({
    summary: 'List the notification profiles collection (read-only, paginated)',
  })
  @ApiOkResponse({ type: NotificationProfilesPageDto })
  async listProfiles(
    @Query() query: QueryNotificationProfilesDto,
  ): Promise<NotificationProfilesPageDto> {
    try {
      const result = await this.listAllNotificationProfilesService.execute({
        limit: query.limit,
        offset: query.offset,
      });

      return {
        items: result.profiles.map((profile) =>
          NotificationProfileResponseMapper.toResponse(profile),
        ),
        total: result.total,
        limit: result.limit,
        offset: result.offset,
      };
    } catch (error) {
      throw this.mapDomainError(error);
    }
  }

  @Get(':userId')
  @ApiOperation({ summary: 'Get notification profile for a user' })
  @ApiOkResponse({ type: NotificationProfileResponseDto })
  async getProfile(
    @Param('userId') userId: string,
  ): Promise<NotificationProfileResponseDto> {
    try {
      const profile = await this.getNotificationProfileService.execute(userId);

      if (!profile) {
        throw new NotFoundException('Notification profile not found');
      }

      return NotificationProfileResponseMapper.toResponse(profile);
    } catch (error) {
      throw this.mapDomainError(error);
    }
  }

  @Get(':userId/subscriptions')
  @ApiOperation({ summary: 'List station subscriptions for a user' })
  async listSubscriptions(@Param('userId') userId: string) {
    try {
      return await this.listNotificationPreferencesService.execute(userId);
    } catch (error) {
      throw this.mapDomainError(error);
    }
  }

  @Post(':userId/subscriptions/:stationId')
  @ApiOkResponse({ type: NotificationProfileResponseDto })
  async subscribe(
    @Param('userId') userId: string,
    @Param('stationId') stationId: string,
    @Body() dto: SubscribeToStationAlertsDto,
  ): Promise<NotificationProfileResponseDto> {
    try {
      const profile = await this.subscribeToStationAlertsService.execute({
        userId,
        stationId,
        alertTypes: dto.alertTypes,
      });

      return NotificationProfileResponseMapper.toResponse(profile);
    } catch (error) {
      throw this.mapDomainError(error);
    }
  }

  @Delete(':userId/subscriptions/:stationId')
  @ApiOkResponse({ type: NotificationProfileResponseDto })
  async unsubscribe(
    @Param('userId') userId: string,
    @Param('stationId') stationId: string,
  ): Promise<NotificationProfileResponseDto> {
    try {
      const profile = await this.unsubscribeFromStationAlertsService.execute({
        userId,
        stationId,
      });

      return NotificationProfileResponseMapper.toResponse(profile);
    } catch (error) {
      throw this.mapDomainError(error);
    }
  }

  @Patch(':userId/subscriptions/:stationId')
  @ApiOkResponse({ type: NotificationProfileResponseDto })
  async updateAlertPreferences(
    @Param('userId') userId: string,
    @Param('stationId') stationId: string,
    @Body() dto: UpdateStationAlertPreferencesDto,
  ): Promise<NotificationProfileResponseDto> {
    try {
      const profile = await this.updateStationAlertPreferencesService.execute({
        userId,
        stationId,
        alertTypes: dto.alertTypes,
      });

      return NotificationProfileResponseMapper.toResponse(profile);
    } catch (error) {
      throw this.mapDomainError(error);
    }
  }

  @Patch(':userId/delivery-channels')
  @ApiExcludeEndpoint()
  @ApiOkResponse({ type: NotificationProfileResponseDto })
  async updateDeliveryChannels(
    @Param('userId') userId: string,
    @Body() dto: UpdateDeliveryChannelsDto,
  ): Promise<NotificationProfileResponseDto> {
    try {
      const profile = await this.updateDeliveryChannelsService.execute({
        userId,
        deliveryChannels: dto.deliveryChannels,
      });

      return NotificationProfileResponseMapper.toResponse(profile);
    } catch (error) {
      throw this.mapDomainError(error);
    }
  }

  @Post(':userId/delivery-channels/telegram/link-code')
  @ApiExcludeEndpoint()
  @ApiOperation({
    summary: 'Create a short-lived Telegram link code for the user',
  })
  @ApiOkResponse({ type: TelegramLinkCodeResponseDto })
  async createTelegramLinkCode(
    @Param('userId') userId: string,
  ): Promise<TelegramLinkCodeResponseDto> {
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

  private mapDomainError(error: unknown): Error {
    if (!(error instanceof Error)) {
      return new BadRequestException('Unable to process notification settings');
    }

    if (error.message === 'Notification profile not found') {
      return new NotFoundException(error.message);
    }

    if (error.message === 'User is not subscribed to the station') {
      return new NotFoundException(error.message);
    }

    return new BadRequestException(error.message);
  }
}
