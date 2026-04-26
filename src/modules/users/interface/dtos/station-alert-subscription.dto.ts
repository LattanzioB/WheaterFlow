import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsOptional,
  NotEquals,
} from 'class-validator';
import { AlertType } from '../../../measurements/domain/value-objects/alert-type.enum';

export class SubscribeToStationAlertsDto {
  @ApiPropertyOptional({
    description:
      'Optional set of alert types to subscribe to for the station. When omitted, the domain defaults are applied.',
    enum: AlertType,
    isArray: true,
    example: [AlertType.STORM, AlertType.CRITICAL_HUMIDITY],
  })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(AlertType, { each: true })
  @NotEquals(AlertType.NONE, { each: true })
  @Type(() => String)
  alertTypes?: AlertType[];
}

export class UpdateStationAlertPreferencesDto {
  @ApiProperty({
    description: 'Complete list of alert types the user wants for the station.',
    enum: AlertType,
    isArray: true,
    example: [AlertType.EXTREME_HEAT, AlertType.FROST],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(AlertType, { each: true })
  @NotEquals(AlertType.NONE, { each: true })
  @Type(() => String)
  alertTypes!: AlertType[];
}
