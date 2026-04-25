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
  @IsString()
  @IsNotEmpty()
  stationId!: string;

  @Type(() => Number)
  @IsNumber()
  temperature!: number;

  @Type(() => Number)
  @IsNumber()
  humidity!: number;

  @Type(() => Number)
  @IsNumber()
  pressure!: number;

  @IsOptional()
  @IsDateString()
  reportedAt?: string;
}

export class QueryMeasurementsDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  stationName?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  tempMin?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  tempMax?: number;

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  alertOnly?: boolean;
}
