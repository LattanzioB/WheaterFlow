import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { StationStatus } from '../../domain/value-objects/station-status.enum';

export class StationLocationDto {
  @ApiProperty({
    description: 'Latitude of the weather station location.',
    example: -34.6037,
    minimum: -90,
    maximum: 90,
  })
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude!: number;

  @ApiProperty({
    description: 'Longitude of the weather station location.',
    example: -58.3816,
    minimum: -180,
    maximum: 180,
  })
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude!: number;
}

export class StationAlertSettingsDto {
  @ApiPropertyOptional({
    description: 'Enable alerts for extreme heat measurements on this station.',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  extremeHeat?: boolean;

  @ApiPropertyOptional({
    description: 'Enable alerts for frost measurements on this station.',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  frost?: boolean;

  @ApiPropertyOptional({
    description: 'Enable alerts for storm conditions on this station.',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  storm?: boolean;

  @ApiPropertyOptional({
    description: 'Enable alerts for critically low or high humidity on this station.',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  criticalHumidity?: boolean;
}

export class CreateStationDto {
  @ApiProperty({
    description: 'Human-readable name for the weather station.',
    example: 'Central Station',
  })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({
    description: 'Geographic coordinates where the station is installed.',
    type: () => StationLocationDto,
  })
  @ValidateNested()
  @Type(() => StationLocationDto)
  location!: StationLocationDto;

  @ApiProperty({
    description: 'Sensor model or hardware identifier used by the station.',
    example: 'Davis Vantage Pro2',
  })
  @IsString()
  @IsNotEmpty()
  sensorModel!: string;

  @ApiPropertyOptional({
    description: 'Initial operational status for the station.',
    enum: StationStatus,
    example: StationStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(StationStatus)
  status?: StationStatus;

  @ApiPropertyOptional({
    description: 'Alert thresholds enabled for this station.',
    type: () => StationAlertSettingsDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => StationAlertSettingsDto)
  alertSettings?: StationAlertSettingsDto;
}

export class UpdateStationDto {
  @ApiPropertyOptional({
    description: 'Updated human-readable station name.',
    example: 'North Field Station',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiPropertyOptional({
    description: 'Updated geographic coordinates for the station.',
    type: () => StationLocationDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => StationLocationDto)
  location?: StationLocationDto;

  @ApiPropertyOptional({
    description: 'Updated sensor model or hardware identifier.',
    example: 'WH-1080',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  sensorModel?: string;

  @ApiPropertyOptional({
    description: 'Updated operational status for the station.',
    enum: StationStatus,
    example: StationStatus.INACTIVE,
  })
  @IsOptional()
  @IsEnum(StationStatus)
  status?: StationStatus;

  @ApiPropertyOptional({
    description: 'Updated alert settings for the station.',
    type: () => StationAlertSettingsDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => StationAlertSettingsDto)
  alertSettings?: StationAlertSettingsDto;
}
