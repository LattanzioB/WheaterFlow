import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class UpdateTelegramDeliveryChannelDto {
  @ApiPropertyOptional({
    example: '123456789',
    nullable: true,
    description:
      'Telegram chat id. Send null to clear the configured destination.',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  chatId?: string | null;
}

export class UpdateLogDeliveryChannelDto {
  @ApiPropertyOptional({
    example: true,
    description: 'Enable or disable local log delivery.',
  })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class DeliveryChannelsDto {
  @ApiPropertyOptional({
    type: () => UpdateTelegramDeliveryChannelDto,
    description: 'Telegram delivery configuration',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateTelegramDeliveryChannelDto)
  telegram?: UpdateTelegramDeliveryChannelDto;

  @ApiPropertyOptional({
    type: () => UpdateLogDeliveryChannelDto,
    description: 'Log delivery configuration',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateLogDeliveryChannelDto)
  log?: UpdateLogDeliveryChannelDto;

  @ApiPropertyOptional({
    example: true,
    description: 'Enable or disable foreground in-app notifications.',
  })
  @IsOptional()
  @IsBoolean()
  inApp?: boolean;
}

export class UpdateDeliveryChannelsDto {
  @ApiProperty({
    type: () => DeliveryChannelsDto,
    description: 'Notification delivery channels to update',
  })
  @ValidateNested()
  @Type(() => DeliveryChannelsDto)
  deliveryChannels!: DeliveryChannelsDto;
}
