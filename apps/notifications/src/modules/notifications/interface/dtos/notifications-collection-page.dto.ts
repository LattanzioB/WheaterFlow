import { ApiProperty } from '@nestjs/swagger';
import { NotificationResponseDto } from './notification-response.dto';

export class NotificationsCollectionPageDto {
  @ApiProperty({
    description: 'Notifications in newest-first order across all users.',
    type: NotificationResponseDto,
    isArray: true,
  })
  items!: NotificationResponseDto[];

  @ApiProperty({
    description: 'Total notifications in the collection.',
    example: 120,
  })
  total!: number;

  @ApiProperty({ example: 20, description: 'Page size used for the query.' })
  limit!: number;

  @ApiProperty({ example: 0, description: 'Offset used for the query.' })
  offset!: number;
}
