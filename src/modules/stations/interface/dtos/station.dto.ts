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
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude!: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude!: number;
}

export class StationAlertSettingsDto {
  @IsOptional()
  @IsBoolean()
  extremeHeat?: boolean;

  @IsOptional()
  @IsBoolean()
  frost?: boolean;

  @IsOptional()
  @IsBoolean()
  storm?: boolean;

  @IsOptional()
  @IsBoolean()
  criticalHumidity?: boolean;
}

export class CreateStationDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ValidateNested()
  @Type(() => StationLocationDto)
  location!: StationLocationDto;

  @IsString()
  @IsNotEmpty()
  sensorModel!: string;

  @IsOptional()
  @IsEnum(StationStatus)
  status?: StationStatus;

  @IsOptional()
  @ValidateNested()
  @Type(() => StationAlertSettingsDto)
  alertSettings?: StationAlertSettingsDto;
}

export class UpdateStationDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => StationLocationDto)
  location?: StationLocationDto;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  sensorModel?: string;

  @IsOptional()
  @IsEnum(StationStatus)
  status?: StationStatus;

  @IsOptional()
  @ValidateNested()
  @Type(() => StationAlertSettingsDto)
  alertSettings?: StationAlertSettingsDto;
}
