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
    description:
      'Minimum temperature (C). Use alone for greater-than semantics.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  tempMin?: number;

  @ApiPropertyOptional({
    example: 35,
    description: 'Maximum temperature (C). Use alone for less-than semantics.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  tempMax?: number;

  @ApiPropertyOptional({
    example: 50,
    description: 'Minimum humidity (%). Use alone for greater-than semantics.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  humidityMin?: number;

  @ApiPropertyOptional({
    example: 90,
    description: 'Maximum humidity (%). Use alone for less-than semantics.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  humidityMax?: number;

  @ApiPropertyOptional({
    example: 980,
    description:
      'Minimum pressure (hPa). Use alone for greater-than semantics.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  pressureMin?: number;

  @ApiPropertyOptional({
    example: 1020,
    description: 'Maximum pressure (hPa). Use alone for less-than semantics.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  pressureMax?: number;

  @ApiPropertyOptional({
    example: '2026-04-01T00:00:00.000Z',
    description: 'Inclusive lower bound for measurement reportedAt (ISO-8601)',
  })
  @IsOptional()
  @IsDateString()
  reportedFrom?: string;

  @ApiPropertyOptional({
    example: '2026-04-30T23:59:59.999Z',
    description: 'Inclusive upper bound for measurement reportedAt (ISO-8601)',
  })
  @IsOptional()
  @IsDateString()
  reportedTo?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Return only measurements that triggered alerts',
  })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  alertOnly?: boolean;
}
