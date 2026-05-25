import { ApiProperty } from '@nestjs/swagger';
import { AlertType } from '@contracts/measurements/alert-type';

export class NotificationResponseDto {
  @ApiProperty({
    description: 'Notification identifier.',
    example: '4d9784cb-c6a1-4a5d-9c58-fd824f9dbf25',
  })
  id!: string;

  @ApiProperty({
    description: 'Owner user identifier.',
    example: 'user-1',
  })
  userId!: string;

  @ApiProperty({
    description: 'Weather station identifier that produced the alert.',
    example: 'station-1',
  })
  stationId!: string;

  @ApiProperty({
    description: 'Weather station display name.',
    example: 'Central',
  })
  stationName!: string;

  @ApiProperty({
    description: 'Detected alert type.',
    enum: AlertType,
    example: AlertType.STORM,
  })
  alertType!: AlertType;

  @ApiProperty({
    description: 'Measured temperature at the alert time.',
    example: 25.2,
  })
  temperature!: number;

  @ApiProperty({
    description: 'Measured humidity percentage at the alert time.',
    example: 91,
  })
  humidity!: number;

  @ApiProperty({
    description: 'Measured pressure at the alert time.',
    example: 970,
  })
  pressure!: number;

  @ApiProperty({
    description: 'Timestamp reported by the measurement source.',
    example: '2026-05-01T10:00:00.000Z',
  })
  reportedAt!: string;

  @ApiProperty({
    description: 'Timestamp when the notification was persisted.',
    example: '2026-05-01T10:01:00.000Z',
  })
  createdAt!: string;

  @ApiProperty({
    description:
      'Timestamp when the user read the notification, or null when unread.',
    example: null,
    nullable: true,
  })
  readAt!: string | null;

  @ApiProperty({
    description: 'Stable upstream alert message identifier.',
    example: 'alert-message-1',
  })
  messageId!: string;
}
