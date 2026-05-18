import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TelegramLinkCodeResponseDto {
  @ApiProperty({
    example: 'WF-A1B2C3D4',
    description: 'Short-lived code the user must send to the Telegram bot.',
  })
  code!: string;

  @ApiProperty({
    example: '2026-04-26T18:45:00.000Z',
    description: 'Expiration timestamp for the link code.',
  })
  expiresAt!: string;

  @ApiProperty({
    example: 'Send /link WF-A1B2C3D4 to the WeatherFlow Telegram bot.',
    description: 'Human-readable next step for the user.',
  })
  instructions!: string;

  @ApiPropertyOptional({
    example: 'weatherflow_bot',
    description: 'Telegram bot username when configured by the server.',
  })
  botUsername?: string;

  @ApiPropertyOptional({
    example: 'https://t.me/weatherflow_bot',
    description: 'Direct bot URL when the username is configured.',
  })
  botUrl?: string;
}
