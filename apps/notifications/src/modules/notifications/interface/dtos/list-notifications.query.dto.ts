import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

function transformOptionalBoolean(value: unknown): unknown {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (value === true || value === 'true') {
    return true;
  }

  if (value === false || value === 'false') {
    return false;
  }

  return value;
}

export class ListNotificationsQueryDto {
  @ApiPropertyOptional({
    description: 'Return only unread notifications when true.',
    example: true,
  })
  @IsOptional()
  @Type(() => String)
  @Transform(({ value }) => transformOptionalBoolean(value))
  @IsBoolean()
  unreadOnly?: boolean;

  @ApiPropertyOptional({
    description: 'Maximum number of notifications to return.',
    example: 20,
    minimum: 1,
    maximum: 100,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Opaque cursor returned by a previous notifications page.',
    example:
      'eyJjcmVhdGVkQXQiOiIyMDI2LTA1LTAxVDEwOjAxOjAwLjAwMFoiLCJpZCI6ImEifQ',
  })
  @IsOptional()
  @Type(() => String)
  @IsString()
  cursor?: string;
}
