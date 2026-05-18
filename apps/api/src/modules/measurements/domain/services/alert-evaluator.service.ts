import {
  DEFAULT_ALERT_SETTINGS,
  type AlertSettings,
} from '@shared/domain/alert-settings';
import { Measurement } from '../entities/measurement.entity';
import { AlertType } from '../value-objects/alert-type.enum';

export class AlertEvaluator {
  evaluate(
    measurement: Measurement,
    alertSettings: AlertSettings = DEFAULT_ALERT_SETTINGS,
  ): AlertType {
    if (
      alertSettings.extremeHeat &&
      measurement.getTemperature().isExtremeHeat()
    ) {
      return AlertType.EXTREME_HEAT;
    }

    if (alertSettings.frost && measurement.getTemperature().isFrost()) {
      return AlertType.FROST;
    }

    if (alertSettings.storm && measurement.getPressure().isStorm()) {
      return AlertType.STORM;
    }

    if (
      alertSettings.criticalHumidity &&
      measurement.getHumidity().isCritical()
    ) {
      return AlertType.CRITICAL_HUMIDITY;
    }

    return AlertType.NONE;
  }
}
