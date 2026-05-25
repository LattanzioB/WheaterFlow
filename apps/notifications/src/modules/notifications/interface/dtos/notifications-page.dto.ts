import { ApiProperty } from '@nestjs/swagger';
import { NotificationResponseDto } from './notification-response.dto';

export class NotificationsPageDto {
  @ApiProperty({
    description: 'Notifications in newest-first order.',
    type: NotificationResponseDto,
    isArray: true,
  })
  items!: NotificationResponseDto[];

  @ApiProperty({
    description:
      'Opaque cursor for the next page, or null when there are no more items.',
    example: null,
    nullable: true,
  })
  nextCursor!: string | null;

  @ApiProperty({
    description:
      'Total unread notifications owned by the caller across all pages.',
    example: 7,
  })
  unreadCount!: number;
}
