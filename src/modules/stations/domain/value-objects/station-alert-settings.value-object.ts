import type {
  AlertSettings,
  AlertSettingsInput,
} from '../../../../shared/domain/alert-settings';
import { normalizeAlertSettings } from '../../../../shared/domain/alert-settings';

export type StationAlertSettingsProps = AlertSettingsInput;

export class StationAlertSettings {
  private constructor(
    private readonly extremeHeat: boolean,
    private readonly frost: boolean,
    private readonly storm: boolean,
    private readonly criticalHumidity: boolean,
  ) {}

  static create(props: StationAlertSettingsProps = {}): StationAlertSettings {
    const normalized = normalizeAlertSettings(props);

    return new StationAlertSettings(
      normalized.extremeHeat,
      normalized.frost,
      normalized.storm,
      normalized.criticalHumidity,
    );
  }

  isExtremeHeatEnabled(): boolean {
    return this.extremeHeat;
  }

  isFrostEnabled(): boolean {
    return this.frost;
  }

  isStormEnabled(): boolean {
    return this.storm;
  }

  isCriticalHumidityEnabled(): boolean {
    return this.criticalHumidity;
  }

  equals(other: StationAlertSettings): boolean {
    return (
      this.extremeHeat === other.extremeHeat &&
      this.frost === other.frost &&
      this.storm === other.storm &&
      this.criticalHumidity === other.criticalHumidity
    );
  }

  toPrimitives(): AlertSettings {
    return {
      extremeHeat: this.extremeHeat,
      frost: this.frost,
      storm: this.storm,
      criticalHumidity: this.criticalHumidity,
    };
  }
}
