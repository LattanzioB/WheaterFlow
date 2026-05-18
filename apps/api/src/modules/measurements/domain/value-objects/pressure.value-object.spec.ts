import { Pressure } from './pressure.value-object';

describe('Pressure', () => {
  it('detects storm risk below the threshold', () => {
    expect(Pressure.create(979.9).isStorm()).toBe(true);
    expect(Pressure.create(980).isStorm()).toBe(false);
  });

  it('compares pressure values by equality', () => {
    expect(Pressure.create(1000).equals(Pressure.create(1000))).toBe(true);
  });

  it('rejects non-finite values', () => {
    expect(() => Pressure.create(Number.POSITIVE_INFINITY)).toThrow(
      'Pressure must be a finite number',
    );
  });

  it('rejects zero or negative pressure values', () => {
    expect(() => Pressure.create(0)).toThrow(
      'Pressure must be greater than zero',
    );
  });
});
