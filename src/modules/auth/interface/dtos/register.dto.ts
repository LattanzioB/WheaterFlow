import { Type } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class RegisterTelegramDeliveryChannelDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  chatId?: string;
}

export class RegisterDeliveryChannelsDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => RegisterTelegramDeliveryChannelDto)
  telegram?: RegisterTelegramDeliveryChannelDto;
}

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password!: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  telegramChatId?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => RegisterDeliveryChannelsDto)
  deliveryChannels?: RegisterDeliveryChannelsDto;
}
