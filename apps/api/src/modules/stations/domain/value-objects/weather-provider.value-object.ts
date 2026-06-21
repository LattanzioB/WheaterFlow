export enum WeatherProviderCode {
  NONE = 'none',
  OPENWEATHER = 'openweather',
}

export class WeatherProvider {
  private constructor(private readonly value: WeatherProviderCode) {}

  static create(
    value: WeatherProviderCode = WeatherProviderCode.NONE,
  ): WeatherProvider {
    if (!Object.values(WeatherProviderCode).includes(value)) {
      throw new Error('Weather provider is not supported');
    }

    return new WeatherProvider(value);
  }

  getValue(): WeatherProviderCode {
    return this.value;
  }

  equals(other: WeatherProvider): boolean {
    return this.value === other.value;
  }
}
