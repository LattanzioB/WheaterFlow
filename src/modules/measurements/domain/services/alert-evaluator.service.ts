import { StationAlertSettings } from '../../../stations/domain/value-objects/station-alert-settings.value-object';
import { Measurement } from '../entities/measurement.entity';
import { AlertType } from '../value-objects/alert-type.enum';

export class AlertEvaluator {
  evaluate(
    measurement: Measurement,
    alertSettings: StationAlertSettings = StationAlertSettings.create(),
  ): AlertType {
    if (
      alertSettings.isExtremeHeatEnabled() &&
      measurement.getTemperature().isExtremeHeat()
    ) {
      return AlertType.EXTREME_HEAT;
    }

    if (
      alertSettings.isFrostEnabled() &&
      measurement.getTemperature().isFrost()
    ) {
      return AlertType.FROST;
    }

    if (alertSettings.isStormEnabled() && measurement.getPressure().isStorm()) {
      return AlertType.STORM;
    }

    if (
      alertSettings.isCriticalHumidityEnabled() &&
      measurement.getHumidity().isCritical()
    ) {
      return AlertType.CRITICAL_HUMIDITY;
    }

    return AlertType.NONE;
  }
}
