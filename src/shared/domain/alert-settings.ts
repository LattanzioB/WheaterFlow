export interface AlertSettings {
  extremeHeat: boolean;
  frost: boolean;
  storm: boolean;
  criticalHumidity: boolean;
}

export interface AlertSettingsInput {
  extremeHeat?: boolean;
  frost?: boolean;
  storm?: boolean;
  criticalHumidity?: boolean;
}

export const DEFAULT_ALERT_SETTINGS: AlertSettings = {
  extremeHeat: true,
  frost: true,
  storm: true,
  criticalHumidity: true,
};

export function normalizeAlertSettings(
  input: AlertSettingsInput = {},
): AlertSettings {
  return {
    extremeHeat: input.extremeHeat ?? DEFAULT_ALERT_SETTINGS.extremeHeat,
    frost: input.frost ?? DEFAULT_ALERT_SETTINGS.frost,
    storm: input.storm ?? DEFAULT_ALERT_SETTINGS.storm,
    criticalHumidity:
      input.criticalHumidity ?? DEFAULT_ALERT_SETTINGS.criticalHumidity,
  };
}
