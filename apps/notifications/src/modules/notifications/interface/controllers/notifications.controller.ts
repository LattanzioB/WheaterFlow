import {
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { GetNotificationsService } from '../../application/services/get-notifications.service';
import { MarkAllNotificationsReadService } from '../../application/services/mark-all-notifications-read.service';
import { MarkNotificationReadService } from '../../application/services/mark-notification-read.service';
import {
  ListNotificationsQueryDto,
  ListNotificationsResponseDto,
  MarkAllNotificationsReadResponseDto,
  NotificationResponseDto,
} from '../dtos/notification.dto';
import { NotificationJwtAuthGuard } from '../guards/notification-jwt-auth.guard';
import type { AuthenticatedNotificationRequest } from '../guards/notification-jwt-auth.guard';
import { NotificationResponseMapper } from '../mappers/notification-response.mapper';

@ApiTags('notifications')
@ApiBearerAuth('bearer')
@Controller('notifications')
@UseGuards(NotificationJwtAuthGuard)
export class NotificationsController {
  constructor(
    private readonly getNotificationsService: GetNotificationsService,
    private readonly markNotificationReadService: MarkNotificationReadService,
    private readonly markAllNotificationsReadService: MarkAllNotificationsReadService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List authenticated user notifications' })
  @ApiOkResponse({ type: ListNotificationsResponseDto })
  async list(
    @Req() req: AuthenticatedNotificationRequest,
    @Query() query: ListNotificationsQueryDto,
  ): Promise<ListNotificationsResponseDto> {
    try {
      const result = await this.getNotificationsService.execute({
        userId: this.getUserId(req),
        limit: query.limit,
        cursor: query.cursor,
        unreadOnly: query.unreadOnly,
      });

      return {
        notifications: result.notifications.map((notification) =>
          NotificationResponseMapper.toResponse(notification),
        ),
        nextCursor: result.nextCursor,
      };
    } catch (error) {
      throw this.mapError(error);
    }
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark one notification as read' })
  @ApiOkResponse({ type: NotificationResponseDto })
  async markRead(
    @Param('id') id: string,
    @Req() req: AuthenticatedNotificationRequest,
  ): Promise<NotificationResponseDto> {
    try {
      const notification = await this.markNotificationReadService.execute({
        id,
        userId: this.getUserId(req),
      });

      return NotificationResponseMapper.toResponse(notification);
    } catch (error) {
      throw this.mapError(error);
    }
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark every unread notification as read' })
  @ApiOkResponse({ type: MarkAllNotificationsReadResponseDto })
  async markAllRead(
    @Req() req: AuthenticatedNotificationRequest,
  ): Promise<MarkAllNotificationsReadResponseDto> {
    try {
      return {
        modifiedCount: await this.markAllNotificationsReadService.execute(
          this.getUserId(req),
        ),
      };
    } catch (error) {
      throw this.mapError(error);
    }
  }

  private getUserId(req: AuthenticatedNotificationRequest): string {
    if (!req.user) {
      throw new BadRequestException('Authenticated user is missing');
    }

    return req.user.userId;
  }

  private mapError(error: unknown): Error {
    if (error instanceof Error && error.message === 'Notification not found') {
      return new NotFoundException(error.message);
    }

    if (error instanceof Error) {
      return new BadRequestException(error.message);
    }

    return new BadRequestException('Unable to process notifications request');
  }
}
