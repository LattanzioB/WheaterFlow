import { Temperature } from './temperature.value-object';

describe('Temperature', () => {
  it('detects extreme heat above the threshold', () => {
    const temperature = Temperature.create(40.1);

    expect(temperature.isExtremeHeat()).toBe(true);
    expect(temperature.isFrost()).toBe(false);
  });

  it('detects frost below zero', () => {
    const temperature = Temperature.create(-0.1);

    expect(temperature.isFrost()).toBe(true);
    expect(temperature.isExtremeHeat()).toBe(false);
  });

  it('uses exact numeric equality', () => {
    const left = Temperature.create(20);
    const right = Temperature.create(20);

    expect(left.equals(right)).toBe(true);
  });

  it('rejects non-finite values', () => {
    expect(() => Temperature.create(Number.NaN)).toThrow(
      'Temperature must be a finite number',
    );
  });
});
