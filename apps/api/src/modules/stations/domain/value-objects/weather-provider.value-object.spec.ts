import {
  WeatherProvider,
  WeatherProviderCode,
} from './weather-provider.value-object';

describe('WeatherProvider', () => {
  it('defaults to no external provider', () => {
    expect(WeatherProvider.create().getValue()).toBe(WeatherProviderCode.NONE);
  });

  it('creates an OpenWeather provider', () => {
    const provider = WeatherProvider.create(WeatherProviderCode.OPENWEATHER);

    expect(provider.getValue()).toBe(WeatherProviderCode.OPENWEATHER);
    expect(
      provider.equals(WeatherProvider.create(WeatherProviderCode.OPENWEATHER)),
    ).toBe(true);
  });

  it('rejects unsupported providers', () => {
    expect(() =>
      WeatherProvider.create('unsupported' as WeatherProviderCode),
    ).toThrow('Weather provider is not supported');
  });
});
