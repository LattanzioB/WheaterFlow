import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  Equals,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsString,
  Length,
} from 'class-validator';
import { MeasurementSource } from '../../domain/value-objects/measurement-source.enum';

export class InternalIngestionMeasurementDto {
  @ApiProperty({ example: 'station-123' })
  @IsString()
  @IsNotEmpty()
  stationId!: string;

  @ApiProperty({ example: 26.4 })
  @Type(() => Number)
  @IsNumber()
  temperature!: number;

  @ApiProperty({ example: 74 })
  @Type(() => Number)
  @IsNumber()
  humidity!: number;

  @ApiProperty({ example: 1012.5 })
  @Type(() => Number)
  @IsNumber()
  pressure!: number;

  @ApiProperty({ example: '2026-06-25T12:00:00.000Z' })
  @IsDateString()
  reportedAt!: string;

  @ApiProperty({
    enum: [MeasurementSource.OPENWEATHER],
    example: MeasurementSource.OPENWEATHER,
  })
  @Equals(MeasurementSource.OPENWEATHER)
  source!: MeasurementSource.OPENWEATHER;

  @ApiProperty({
    example: '0f2f0e332a783584246f5f972f6d3e06afc7eb74cb67ebf5db052363196a15c8',
  })
  @IsString()
  @Length(64, 64)
  idempotencyKey!: string;
}
