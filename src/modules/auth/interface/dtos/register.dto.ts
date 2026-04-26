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
    example: '123456789',
    description: 'Telegram chat id for alert delivery',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  chatId?: string;
}

export class RegisterDeliveryChannelsDto {
  @ApiPropertyOptional({
    type: () => RegisterTelegramDeliveryChannelDto,
    description: 'Telegram delivery configuration',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => RegisterTelegramDeliveryChannelDto)
  telegram?: RegisterTelegramDeliveryChannelDto;
}

export class RegisterDto {
  @ApiProperty({
    example: 'Bruno',
    description: 'User first name',
  })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({
    example: 'Lattanzio',
    description: 'User last name',
  })
  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @ApiProperty({
    example: 'bruno@example.com',
    description: 'User email address',
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    example: 'secure123',
    minLength: 8,
    description: 'User password',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password!: string;

  @ApiPropertyOptional({
    type: () => RegisterDeliveryChannelsDto,
    description: 'Notification delivery channels to configure at registration',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => RegisterDeliveryChannelsDto)
  deliveryChannels?: RegisterDeliveryChannelsDto;
}
