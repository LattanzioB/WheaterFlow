import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
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

export class DeliveryChannelsDto {
  @ApiPropertyOptional({
    type: () => UpdateTelegramDeliveryChannelDto,
    description: 'Telegram delivery configuration',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateTelegramDeliveryChannelDto)
  telegram?: UpdateTelegramDeliveryChannelDto;
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
