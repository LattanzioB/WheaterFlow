import { Location } from './location.value-object';

describe('Location', () => {
  it('creates locations at the inclusive coordinate boundaries', () => {
    const location = Location.create(-90, 180);

    expect(location.getLatitude()).toBe(-90);
    expect(location.getLongitude()).toBe(180);
  });

  it('compares coordinates by value', () => {
    const left = Location.create(-34.6037, -58.3816);
    const right = Location.create(-34.6037, -58.3816);

    expect(left.equals(right)).toBe(true);
  });

  it('rejects latitudes outside the valid range', () => {
    expect(() => Location.create(90.1, 0)).toThrow(
      'Latitude must be between -90 and 90',
    );
  });

  it('rejects longitudes outside the valid range', () => {
    expect(() => Location.create(0, -180.1)).toThrow(
      'Longitude must be between -180 and 180',
    );
  });
});
