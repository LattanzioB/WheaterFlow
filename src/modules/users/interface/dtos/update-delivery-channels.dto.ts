import { Type } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';

export class UpdateTelegramDeliveryChannelDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  chatId?: string | null;
}

export class DeliveryChannelsDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateTelegramDeliveryChannelDto)
  telegram?: UpdateTelegramDeliveryChannelDto;
}

export class UpdateDeliveryChannelsDto {
  @ValidateNested()
  @Type(() => DeliveryChannelsDto)
  deliveryChannels!: DeliveryChannelsDto;
}
