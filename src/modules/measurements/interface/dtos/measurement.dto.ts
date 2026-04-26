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
import { AlertType } from '../../domain/value-objects/alert-type.enum';

export class CreateMeasurementDto {
  @ApiProperty({
    description: 'Identifier of the weather station that produced the measurement.',
    example: 'station-1',
  })
  @IsString()
  @IsNotEmpty()
  stationId!: string;

  @ApiProperty({
    description: 'Recorded air temperature in Celsius.',
    example: 32.4,
  })
  @Type(() => Number)
  @IsNumber()
  temperature!: number;

  @ApiProperty({
    description: 'Recorded relative humidity percentage.',
    example: 65,
  })
  @Type(() => Number)
  @IsNumber()
  humidity!: number;

  @ApiProperty({
    description: 'Recorded atmospheric pressure in hPa.',
    example: 1013,
  })
  @Type(() => Number)
  @IsNumber()
  pressure!: number;

  @ApiPropertyOptional({
    description: 'Optional ISO timestamp reported by the station sensor.',
    example: '2026-04-25T12:30:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  reportedAt?: string;
}

export class QueryMeasurementsDto {
  @ApiPropertyOptional({
    description: 'Partial station name used to filter measurements by station.',
    example: 'Central',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  stationName?: string;

  @ApiPropertyOptional({
    description: 'Minimum temperature threshold for the search.',
    example: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  tempMin?: number;

  @ApiPropertyOptional({
    description: 'Maximum temperature threshold for the search.',
    example: 40,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  tempMax?: number;

  @ApiPropertyOptional({
    description: 'When true, returns only measurements that triggered alerts.',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  alertOnly?: boolean;
}

export class MeasurementResponseDto {
  @ApiProperty({
    description: 'Unique identifier for the measurement.',
    example: 'measurement-1',
  })
  id!: string;

  @ApiProperty({
    description: 'Station identifier associated with the measurement.',
    example: 'station-1',
  })
  stationId!: string;

  @ApiProperty({
    description: 'Stored air temperature in Celsius.',
    example: 32.4,
  })
  temperature!: number;

  @ApiProperty({
    description: 'Stored relative humidity percentage.',
    example: 65,
  })
  humidity!: number;

  @ApiProperty({
    description: 'Stored atmospheric pressure in hPa.',
    example: 1013,
  })
  pressure!: number;

  @ApiProperty({
    description: 'ISO timestamp when the measurement was reported.',
    example: '2026-04-25T12:30:00.000Z',
  })
  reportedAt!: string;

  @ApiProperty({
    description: 'Whether the measurement triggered any alert condition.',
    example: true,
  })
  alertStatus!: boolean;

  @ApiProperty({
    description: 'Detected alert classification for the measurement.',
    enum: AlertType,
    example: AlertType.EXTREME_HEAT,
  })
  alertType!: AlertType;
}
