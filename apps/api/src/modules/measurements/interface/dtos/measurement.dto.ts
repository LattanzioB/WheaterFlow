import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateMeasurementDto {
  @ApiProperty({
    example: 'station-123',
    description: 'Station identifier',
  })
  @IsString()
  @IsNotEmpty()
  stationId!: string;

  @ApiProperty({
    example: 26.4,
    description: 'Temperature in Celsius',
  })
  @Type(() => Number)
  @IsNumber()
  temperature!: number;

  @ApiProperty({
    example: 74,
    description: 'Humidity percentage',
  })
  @Type(() => Number)
  @IsNumber()
  humidity!: number;

  @ApiProperty({
    example: 1012.5,
    description: 'Atmospheric pressure in hPa',
  })
  @Type(() => Number)
  @IsNumber()
  pressure!: number;

  @ApiPropertyOptional({
    example: '2026-04-26T18:00:00.000Z',
    description: 'Measurement timestamp in ISO-8601 format',
  })
  @IsOptional()
  @IsDateString()
  reportedAt?: string;
}

export class QueryMeasurementsDto {
  @ApiPropertyOptional({
    example: 'North Station',
    description: 'Filter by station name',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  stationName?: string;

  @ApiPropertyOptional({
    example: 10,
    description: 'Minimum temperature filter',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  tempMin?: number;

  @ApiPropertyOptional({
    example: 35,
    description: 'Maximum temperature filter',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  tempMax?: number;

  @ApiPropertyOptional({
    example: true,
    description: 'Return only measurements that triggered alerts',
  })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  alertOnly?: boolean;
}
