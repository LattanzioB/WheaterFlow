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
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(AlertType, { each: true })
  @NotEquals(AlertType.NONE, { each: true })
  @Type(() => String)
  alertTypes?: AlertType[];
}

export class UpdateStationAlertPreferencesDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(AlertType, { each: true })
  @NotEquals(AlertType.NONE, { each: true })
  @Type(() => String)
  alertTypes!: AlertType[];
}
