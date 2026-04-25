import { Humidity } from './humidity.value-object';

describe('Humidity', () => {
  it('creates values at the inclusive range boundaries', () => {
    expect(Humidity.create(0).getValue()).toBe(0);
    expect(Humidity.create(100).getValue()).toBe(100);
  });

  it('identifies critical humidity above ninety percent', () => {
    expect(Humidity.create(90).isCritical()).toBe(false);
    expect(Humidity.create(90.1).isCritical()).toBe(true);
  });

  it('compares values by equality', () => {
    expect(Humidity.create(55).equals(Humidity.create(55))).toBe(true);
  });

  it('rejects humidity values outside the valid range', () => {
    expect(() => Humidity.create(-1)).toThrow(
      'Humidity must be between 0 and 100',
    );
    expect(() => Humidity.create(101)).toThrow(
      'Humidity must be between 0 and 100',
    );
  });
});
