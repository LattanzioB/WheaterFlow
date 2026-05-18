import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
import { AlertType } from '../../../measurements/domain/value-objects/alert-type.enum';

export class UserNotificationPreferenceDto {
  @ApiProperty({
    example: 'station-1',
    description: 'Station identifier associated with the subscription.',
  })
  stationId!: string;

  @ApiProperty({
    enum: AlertType,
    enumName: 'AlertType',
    isArray: true,
    example: [AlertType.STORM],
    description: 'Alert types enabled for the station subscription.',
  })
  alertTypes!: AlertType[];
}

export class UserTelegramDeliveryChannelDto {
  @ApiProperty({
    example: '12345',
    nullable: true,
    description: 'Telegram chat identifier linked to the user, if configured.',
  })
  chatId!: string | null;
}

export class UserDeliveryChannelsDto {
  @ApiProperty({
    type: UserTelegramDeliveryChannelDto,
    description: 'User delivery channel configuration.',
  })
  telegram!: UserTelegramDeliveryChannelDto;
}

export class UserResponseDto {
  @ApiProperty({
    example: 'user-1',
    description: 'Unique identifier of the authenticated user.',
  })
  id!: string;

  @ApiProperty({
    example: 'Bruno',
    description: 'User first name.',
  })
  name!: string;

  @ApiProperty({
    example: 'Lattanzio',
    description: 'User last name.',
  })
  lastName!: string;

  @ApiProperty({
    example: 'bruno@example.com',
    description: 'User email address.',
  })
  email!: string;

  @ApiProperty({
    type: UserNotificationPreferenceDto,
    isArray: true,
    description: 'Per-station notification preferences for the user.',
  })
  notificationPreferences!: UserNotificationPreferenceDto[];

  @ApiHideProperty()
  deliveryChannels!: UserDeliveryChannelsDto;

  @ApiProperty({
    example: '2026-04-25T12:00:00.000Z',
    description: 'User creation timestamp.',
  })
  createdAt!: string;
}
