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
import { WeatherProviderCode } from '../../domain/value-objects/weather-provider.value-object';

export class StationLocationDto {
  @ApiProperty({
    example: -34.6037,
    minimum: -90,
    maximum: 90,
    description: 'Station latitude',
  })
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude!: number;

  @ApiProperty({
    example: -58.3816,
    minimum: -180,
    maximum: 180,
    description: 'Station longitude',
  })
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude!: number;
}

export class StationAlertSettingsDto {
  @ApiPropertyOptional({
    example: true,
    description: 'Enable extreme heat alerts',
  })
  @IsOptional()
  @IsBoolean()
  extremeHeat?: boolean;

  @ApiPropertyOptional({
    example: false,
    description: 'Enable frost alerts',
  })
  @IsOptional()
  @IsBoolean()
  frost?: boolean;

  @ApiPropertyOptional({
    example: true,
    description: 'Enable storm alerts',
  })
  @IsOptional()
  @IsBoolean()
  storm?: boolean;

  @ApiPropertyOptional({
    example: false,
    description: 'Enable critical humidity alerts',
  })
  @IsOptional()
  @IsBoolean()
  criticalHumidity?: boolean;
}

export class CreateStationDto {
  @ApiProperty({
    example: 'North Station',
    description: 'Station name',
  })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({
    type: () => StationLocationDto,
    description: 'Station coordinates',
  })
  @ValidateNested()
  @Type(() => StationLocationDto)
  location!: StationLocationDto;

  @ApiProperty({
    example: 'BME280',
    description: 'Sensor model identifier',
  })
  @IsString()
  @IsNotEmpty()
  sensorModel!: string;

  @ApiPropertyOptional({
    enum: StationStatus,
    example: StationStatus.ACTIVE,
    description: 'Current station status',
  })
  @IsOptional()
  @IsEnum(StationStatus)
  status?: StationStatus;

  @ApiPropertyOptional({
    enum: WeatherProviderCode,
    example: WeatherProviderCode.OPENWEATHER,
    default: WeatherProviderCode.NONE,
    description: 'Climate provider associated with the station coordinates',
  })
  @IsOptional()
  @IsEnum(WeatherProviderCode)
  provider?: WeatherProviderCode;

  @ApiPropertyOptional({
    type: () => StationAlertSettingsDto,
    description: 'Station alert configuration',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => StationAlertSettingsDto)
  alertSettings?: StationAlertSettingsDto;
}

export class QueryStationsDto {
  @ApiPropertyOptional({
    example: 'Central',
    description: 'Case-insensitive partial match on station name',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;
}

export class UpdateStationDto {
  @ApiPropertyOptional({
    example: 'North Station',
    description: 'Updated station name',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiPropertyOptional({
    type: () => StationLocationDto,
    description: 'Updated station coordinates',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => StationLocationDto)
  location?: StationLocationDto;

  @ApiPropertyOptional({
    example: 'BME280',
    description: 'Updated sensor model identifier',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  sensorModel?: string;

  @ApiPropertyOptional({
    enum: StationStatus,
    example: StationStatus.ACTIVE,
    description: 'Updated station status',
  })
  @IsOptional()
  @IsEnum(StationStatus)
  status?: StationStatus;

  @ApiPropertyOptional({
    enum: WeatherProviderCode,
    example: WeatherProviderCode.OPENWEATHER,
    description:
      'Updated climate provider associated with the station coordinates',
  })
  @IsOptional()
  @IsEnum(WeatherProviderCode)
  provider?: WeatherProviderCode;

  @ApiPropertyOptional({
    type: () => StationAlertSettingsDto,
    description: 'Updated station alert configuration',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => StationAlertSettingsDto)
  alertSettings?: StationAlertSettingsDto;
}

export class StationResponseDto {
  @ApiProperty({ example: 'station-123' })
  id!: string;

  @ApiProperty({ example: 'Buenos Aires' })
  name!: string;

  @ApiProperty({ type: () => StationLocationDto })
  location!: StationLocationDto;

  @ApiProperty({ example: 'OpenWeatherMap' })
  sensorModel!: string;

  @ApiProperty({ enum: StationStatus })
  status!: StationStatus;

  @ApiProperty({ example: 'user-123' })
  ownerId!: string;

  @ApiProperty({
    enum: WeatherProviderCode,
    example: WeatherProviderCode.OPENWEATHER,
  })
  provider!: WeatherProviderCode;

  @ApiProperty({ type: () => StationAlertSettingsDto })
  alertSettings!: {
    extremeHeat: boolean;
    frost: boolean;
    storm: boolean;
    criticalHumidity: boolean;
  };

  @ApiProperty({ example: '2026-06-21T12:00:00.000Z' })
  createdAt!: string;
}
