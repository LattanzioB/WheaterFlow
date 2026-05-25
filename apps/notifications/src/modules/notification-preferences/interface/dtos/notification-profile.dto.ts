import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  NotEquals,
  ValidateNested,
} from 'class-validator';
import { AlertType } from '@contracts/measurements/alert-type';

export class StationAlertPreferenceDto {
  @ApiProperty({ example: 'station-1' })
  stationId!: string;

  @ApiProperty({ enum: AlertType, isArray: true })
  alertTypes!: AlertType[];
}

export class TelegramDeliveryChannelDto {
  @ApiProperty({ example: '12345', nullable: true })
  chatId!: string | null;
}

export class LogDeliveryChannelDto {
  @ApiProperty({ example: true })
  enabled!: boolean;
}

export class NotificationDeliveryChannelsDto {
  @ApiProperty({ type: TelegramDeliveryChannelDto })
  telegram!: TelegramDeliveryChannelDto;

  @ApiProperty({ type: LogDeliveryChannelDto })
  log!: LogDeliveryChannelDto;

  @ApiProperty({ example: true })
  inApp!: boolean;
}

export class NotificationProfileResponseDto {
  @ApiProperty({ example: 'user-1' })
  userId!: string;

  @ApiProperty({ type: StationAlertPreferenceDto, isArray: true })
  notificationPreferences!: StationAlertPreferenceDto[];

  @ApiProperty({ type: NotificationDeliveryChannelsDto })
  deliveryChannels!: NotificationDeliveryChannelsDto;
}

export class SubscribeToStationAlertsDto {
  @ApiPropertyOptional({
    enum: AlertType,
    isArray: true,
    description:
      'Alert types to subscribe to. Omit to use the station defaults.',
  })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(AlertType, { each: true })
  @NotEquals(AlertType.NONE, { each: true })
  @Type(() => String)
  alertTypes?: AlertType[];
}

export class UpdateStationAlertPreferencesDto {
  @ApiProperty({ enum: AlertType, isArray: true })
  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(AlertType, { each: true })
  @NotEquals(AlertType.NONE, { each: true })
  @Type(() => String)
  alertTypes!: AlertType[];
}

export class UpdateTelegramDeliveryChannelDto {
  @ApiPropertyOptional({ example: '12345', nullable: true })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  chatId?: string | null;
}

export class UpdateLogDeliveryChannelDto {
  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class DeliveryChannelsInputDto {
  @ApiPropertyOptional({ type: UpdateTelegramDeliveryChannelDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateTelegramDeliveryChannelDto)
  telegram?: UpdateTelegramDeliveryChannelDto;

  @ApiPropertyOptional({ type: UpdateLogDeliveryChannelDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateLogDeliveryChannelDto)
  log?: UpdateLogDeliveryChannelDto;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  inApp?: boolean;
}

export class UpdateDeliveryChannelsDto {
  @ApiProperty({
    type: DeliveryChannelsInputDto,
    example: {
      telegram: { chatId: '12345' },
      log: { enabled: true },
      inApp: true,
    },
  })
  @ValidateNested()
  @Type(() => DeliveryChannelsInputDto)
  deliveryChannels!: DeliveryChannelsInputDto;
}

export class TelegramLinkCodeResponseDto {
  @ApiProperty({ example: 'WF-A1B2C3D4' })
  code!: string;

  @ApiProperty({ example: '2026-04-26T18:45:00.000Z' })
  expiresAt!: string;

  @ApiProperty({
    example: 'Send /link WF-A1B2C3D4 to the WeatherFlow Telegram bot.',
  })
  instructions!: string;

  @ApiPropertyOptional({ example: 'weatherflow_bot' })
  botUsername?: string;

  @ApiPropertyOptional({ example: 'https://t.me/weatherflow_bot' })
  botUrl?: string;
}
