import {
  BadRequestException,
  Controller,
  Get,
  HttpCode,
  HttpException,
  NotFoundException,
  Param,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ListUserNotificationsService } from '../../application/services/list-user-notifications.service';
import { MarkAllNotificationsReadService } from '../../application/services/mark-all-notifications-read.service';
import { MarkNotificationReadService } from '../../application/services/mark-notification-read.service';
import {
  ListNotificationsQueryDto,
  NotificationIdParamDto,
  NotificationsPageDto,
} from '../dtos/notification.dto';
import { NotificationJwtAuthGuard } from '../guards/notification-jwt-auth.guard';
import type { AuthenticatedNotificationRequest } from '../guards/notification-jwt-auth.guard';
import { NotificationResponseMapper } from '../mappers/notification-response.mapper';

@ApiTags('Notifications')
@ApiBearerAuth('bearer')
@Controller('notifications')
@UseGuards(NotificationJwtAuthGuard)
export class NotificationsController {
  constructor(
    private readonly listUserNotificationsService: ListUserNotificationsService,
    private readonly markNotificationReadService: MarkNotificationReadService,
    private readonly markAllNotificationsReadService: MarkAllNotificationsReadService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List authenticated user notifications' })
  @ApiResponse({ status: 200, type: NotificationsPageDto })
  @ApiResponse({ status: 401, description: 'Missing or invalid bearer token.' })
  async list(
    @Req() req: AuthenticatedNotificationRequest,
    @Query() query: ListNotificationsQueryDto,
  ): Promise<NotificationsPageDto> {
    try {
      const result = await this.listUserNotificationsService.execute({
        userId: this.getUserId(req),
        limit: query.limit,
        cursor: query.cursor,
        unreadOnly: query.unreadOnly,
      });

      return {
        items: result.notifications.map((notification) =>
          NotificationResponseMapper.toResponse(notification),
        ),
        nextCursor: result.nextCursor,
        unreadCount: result.unreadCount,
      };
    } catch (error) {
      throw this.mapError(error);
    }
  }

  @Patch(':id/read')
  @HttpCode(204)
  @ApiOperation({ summary: 'Mark one notification as read' })
  @ApiResponse({ status: 204, description: 'Notification marked as read.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid bearer token.' })
  @ApiResponse({ status: 404, description: 'Notification not found.' })
  async markRead(
    @Param() params: NotificationIdParamDto,
    @Req() req: AuthenticatedNotificationRequest,
  ): Promise<void> {
    try {
      await this.markNotificationReadService.execute({
        id: params.id,
        userId: this.getUserId(req),
      });
    } catch (error) {
      throw this.mapError(error);
    }
  }

  @Patch('read-all')
  @HttpCode(204)
  @ApiOperation({ summary: 'Mark every unread notification as read' })
  @ApiResponse({
    status: 204,
    description: 'All unread notifications marked as read.',
  })
  @ApiResponse({ status: 401, description: 'Missing or invalid bearer token.' })
  async markAllRead(
    @Req() req: AuthenticatedNotificationRequest,
  ): Promise<void> {
    try {
      await this.markAllNotificationsReadService.execute(this.getUserId(req));
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
    if (error instanceof HttpException) {
      return error;
    }

    if (error instanceof Error && error.message === 'Notification not found') {
      return new NotFoundException(error.message);
    }

    if (error instanceof Error) {
      return new BadRequestException(error.message);
    }

    return new BadRequestException('Unable to process notifications request');
  }
}
