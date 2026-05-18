import { StationAlertSettings } from './station-alert-settings.value-object';

describe('StationAlertSettings', () => {
  it('enables every alert by default', () => {
    const settings = StationAlertSettings.create();

    expect(settings.toPrimitives()).toEqual({
      extremeHeat: true,
      frost: true,
      storm: true,
      criticalHumidity: true,
    });
  });

  it('keeps explicit alert preferences', () => {
    const settings = StationAlertSettings.create({
      extremeHeat: false,
      frost: true,
      storm: false,
      criticalHumidity: true,
    });

    expect(settings.isExtremeHeatEnabled()).toBe(false);
    expect(settings.isFrostEnabled()).toBe(true);
    expect(settings.isStormEnabled()).toBe(false);
    expect(settings.isCriticalHumidityEnabled()).toBe(true);
  });

  it('compares settings by value', () => {
    const left = StationAlertSettings.create({ storm: false });
    const right = StationAlertSettings.create({ storm: false });

    expect(left.equals(right)).toBe(true);
  });
});
