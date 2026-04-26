import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
  @ApiPropertyOptional({
    description: 'Telegram chat identifier used to deliver weather alerts.',
    example: '123456789',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  chatId?: string;
}

export class RegisterDeliveryChannelsDto {
  @ApiPropertyOptional({
    description: 'Telegram delivery channel configuration for this user.',
    type: () => RegisterTelegramDeliveryChannelDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => RegisterTelegramDeliveryChannelDto)
  telegram?: RegisterTelegramDeliveryChannelDto;
}

export class RegisterDto {
  @ApiProperty({
    description: 'Given name for the new user account.',
    example: 'Bruno',
  })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({
    description: 'Family name for the new user account.',
    example: 'Lattanzio',
  })
  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @ApiProperty({
    description: 'Unique email address for the new account.',
    example: 'bruno@example.com',
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    description: 'Password for the new account. Must contain at least 8 characters.',
    example: 'secure123',
    minLength: 8,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password!: string;

  @ApiPropertyOptional({
    description:
      'Legacy Telegram chat identifier accepted during registration for compatibility.',
    example: '123456789',
    deprecated: true,
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  telegramChatId?: string;

  @ApiPropertyOptional({
    description:
      'Channel-specific delivery settings captured during registration.',
    type: () => RegisterDeliveryChannelsDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => RegisterDeliveryChannelsDto)
  deliveryChannels?: RegisterDeliveryChannelsDto;
}
