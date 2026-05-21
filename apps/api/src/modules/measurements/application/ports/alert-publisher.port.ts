import type { ClimateAlertDetectedMessage } from '@contracts/measurements/climate-alert-detected.message';

export interface AlertPublisher {
  publishClimateAlert(message: ClimateAlertDetectedMessage): Promise<void>;
}
