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
    enum: AlertType,
    enumName: 'AlertType',
    isArray: true,
    example: [AlertType.EXTREME_HEAT, AlertType.STORM],
    description:
      'Alert types to subscribe to. Omit to use the station defaults.',
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
    enum: AlertType,
    enumName: 'AlertType',
    isArray: true,
    example: [AlertType.FROST],
    description: 'Alert types to keep enabled for this station subscription',
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(AlertType, { each: true })
  @NotEquals(AlertType.NONE, { each: true })
  @Type(() => String)
  alertTypes!: AlertType[];
}
