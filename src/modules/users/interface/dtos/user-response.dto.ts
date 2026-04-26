import { ApiProperty } from '@nestjs/swagger';
import { AlertType } from '../../../measurements/domain/value-objects/alert-type.enum';

export class UserNotificationPreferenceResponseDto {
  @ApiProperty({
    description: 'Weather station identifier linked to this preference.',
    example: 'station-1',
  })
  stationId!: string;

  @ApiProperty({
    description: 'Alert types the user wants to receive for the station.',
    enum: AlertType,
    isArray: true,
    example: [AlertType.STORM, AlertType.EXTREME_HEAT],
  })
  alertTypes!: AlertType[];
}

export class TelegramDeliveryChannelResponseDto {
  @ApiProperty({
    description: 'Telegram chat identifier configured for alert delivery.',
    example: '123456789',
    nullable: true,
  })
  chatId!: string | null;
}

export class UserDeliveryChannelsResponseDto {
  @ApiProperty({
    description: 'Telegram channel settings for the user.',
    type: () => TelegramDeliveryChannelResponseDto,
  })
  telegram!: TelegramDeliveryChannelResponseDto;
}

export class UserResponseDto {
  @ApiProperty({
    description: 'Unique identifier of the user.',
    example: 'user-1',
  })
  id!: string;

  @ApiProperty({
    description: 'User given name.',
    example: 'Bruno',
  })
  name!: string;

  @ApiProperty({
    description: 'User family name.',
    example: 'Lattanzio',
  })
  lastName!: string;

  @ApiProperty({
    description: 'Email address registered for the user.',
    example: 'bruno@example.com',
  })
  email!: string;

  @ApiProperty({
    description: 'Station-specific alert preferences.',
    type: () => UserNotificationPreferenceResponseDto,
    isArray: true,
  })
  notificationPreferences!: UserNotificationPreferenceResponseDto[];

  @ApiProperty({
    description: 'Configured delivery channels for the user.',
    type: () => UserDeliveryChannelsResponseDto,
  })
  deliveryChannels!: UserDeliveryChannelsResponseDto;

  @ApiProperty({
    description: 'ISO timestamp when the user account was created.',
    example: '2026-04-25T12:00:00.000Z',
  })
  createdAt!: string;
}
