import {
  BadGatewayException,
  GatewayTimeoutException,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  WeatherDataProviderCircuitOpenError,
  WeatherDataProviderInvalidPayloadError,
  WeatherDataProviderTimeoutError,
} from '../../domain/errors/weather-data-provider.errors';
import type { WeatherDataProvider } from '../../domain/ports/weather-data-provider.port';
import { CurrentWeatherController } from './current-weather.controller';

describe('CurrentWeatherController', () => {
  const buildProvider = () =>
    ({
      getCurrentWeather: jest.fn(),
    }) as unknown as jest.Mocked<WeatherDataProvider>;

  it('returns a normalized current weather reading by coordinates', async () => {
    const provider = buildProvider();
    const controller = new CurrentWeatherController(provider);
    provider.getCurrentWeather.mockResolvedValue({
      externalId: '3435910',
      temperature: { value: 18.4, unit: 'celsius' },
      humidity: { value: 63, unit: 'percent' },
      pressure: { value: 1017, unit: 'hPa' },
      observedAt: new Date('2026-06-26T12:00:00.000Z'),
    });

    await expect(
      controller.getCurrentWeather({
        latitude: -34.6037,
        longitude: -58.3816,
      }),
    ).resolves.toEqual({
      externalId: '3435910',
      temperature: { value: 18.4, unit: 'celsius' },
      humidity: { value: 63, unit: 'percent' },
      pressure: { value: 1017, unit: 'hPa' },
      observedAt: '2026-06-26T12:00:00.000Z',
    });
    expect(provider.getCurrentWeather).toHaveBeenCalledWith({
      latitude: -34.6037,
      longitude: -58.3816,
    });
  });

  it('maps OpenWeather timeout to 504', async () => {
    const provider = buildProvider();
    const controller = new CurrentWeatherController(provider);
    provider.getCurrentWeather.mockRejectedValue(
      new WeatherDataProviderTimeoutError(5_000),
    );

    await expect(
      controller.getCurrentWeather({ latitude: -34, longitude: -58 }),
    ).rejects.toBeInstanceOf(GatewayTimeoutException);
  });

  it('maps unavailable or open circuit provider state to 503', async () => {
    const provider = buildProvider();
    const controller = new CurrentWeatherController(provider);
    provider.getCurrentWeather.mockRejectedValue(
      new WeatherDataProviderCircuitOpenError(new Date()),
    );

    await expect(
      controller.getCurrentWeather({ latitude: -34, longitude: -58 }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('maps invalid provider payloads without leaking internals', async () => {
    const provider = buildProvider();
    const controller = new CurrentWeatherController(provider);
    provider.getCurrentWeather.mockRejectedValue(
      new WeatherDataProviderInvalidPayloadError('main.temp missing'),
    );

    await expect(
      controller.getCurrentWeather({ latitude: -34, longitude: -58 }),
    ).rejects.toBeInstanceOf(BadGatewayException);
  });
});
