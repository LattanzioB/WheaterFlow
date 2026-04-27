import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';

export class QuerySubscribedStationsDto {
  @ApiPropertyOptional({
    example: true,
    description:
      'Return only subscriptions whose latest measurement currently has an active alert',
  })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  activeAlertOnly?: boolean;
}
