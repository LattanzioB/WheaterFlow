export interface StationAlertSettingsProps {
  extremeHeat?: boolean;
  frost?: boolean;
  storm?: boolean;
  criticalHumidity?: boolean;
}

export class StationAlertSettings {
  private constructor(
    private readonly extremeHeat: boolean,
    private readonly frost: boolean,
    private readonly storm: boolean,
    private readonly criticalHumidity: boolean,
  ) {}

  static create(props: StationAlertSettingsProps = {}): StationAlertSettings {
    return new StationAlertSettings(
      props.extremeHeat ?? true,
      props.frost ?? true,
      props.storm ?? true,
      props.criticalHumidity ?? true,
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

  toPrimitives(): Required<StationAlertSettingsProps> {
    return {
      extremeHeat: this.extremeHeat,
      frost: this.frost,
      storm: this.storm,
      criticalHumidity: this.criticalHumidity,
    };
  }
}
