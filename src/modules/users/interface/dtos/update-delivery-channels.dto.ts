import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';

export class UpdateTelegramDeliveryChannelDto {
  @ApiPropertyOptional({
    description: 'Telegram chat identifier used to receive alerts.',
    example: '123456789',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  chatId?: string | null;
}

export class DeliveryChannelsDto {
  @ApiPropertyOptional({
    description: 'Telegram delivery channel configuration for the user.',
    type: () => UpdateTelegramDeliveryChannelDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateTelegramDeliveryChannelDto)
  telegram?: UpdateTelegramDeliveryChannelDto;
}

export class UpdateDeliveryChannelsDto {
  @ApiProperty({
    description: 'Delivery-channel settings managed separately from alert preferences.',
    type: () => DeliveryChannelsDto,
  })
  @ValidateNested()
  @Type(() => DeliveryChannelsDto)
  deliveryChannels!: DeliveryChannelsDto;
}
