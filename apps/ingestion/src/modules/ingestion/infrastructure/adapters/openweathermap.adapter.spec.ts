import { AxiosError, type AxiosInstance, type AxiosResponse } from 'axios';
import {
  WeatherDataProviderHttpError,
  WeatherDataProviderInvalidPayloadError,
  WeatherDataProviderTimeoutError,
} from '../../domain/errors/weather-data-provider.errors';
import {
  OPENWEATHER_CLIENT_ERROR_FIXTURE,
  OPENWEATHER_CURRENT_SUCCESS_FIXTURE,
  OPENWEATHER_INVALID_PAYLOAD_FIXTURE,
  OPENWEATHER_SERVER_ERROR_FIXTURE,
} from './fixtures/openweather-current.fixtures';
import { OpenWeatherMapAdapter } from './openweathermap.adapter';
import { OpenWeatherMapResponseMapper } from './openweathermap-response.mapper';

describe('OpenWeatherMapAdapter', () => {
  const timeoutMs = 5_000;
  const location = {
    latitude: -34.6037,
    longitude: -58.3816,
  };
  let get: jest.MockedFunction<AxiosInstance['get']>;
  let adapter: OpenWeatherMapAdapter;

  beforeEach(() => {
    get = jest.fn();
    const httpClient = { get } as unknown as AxiosInstance;
    adapter = new OpenWeatherMapAdapter(
      httpClient,
      timeoutMs,
      new OpenWeatherMapResponseMapper(),
    );
  });

  it('queries Current Weather by coordinates using metric units and normalizes the reading', async () => {
    get.mockResolvedValue(response(200, OPENWEATHER_CURRENT_SUCCESS_FIXTURE));

    await expect(adapter.getCurrentWeather(location)).resolves.toEqual({
      externalId: '3435910',
      temperature: {
        value: 18.42,
        unit: 'celsius',
      },
      humidity: {
        value: 63,
        unit: 'percent',
      },
      pressure: {
        value: 1017,
        unit: 'hPa',
      },
      observedAt: new Date('2024-06-21T14:00:00.000Z'),
    });

    expect(get).toHaveBeenCalledWith('/data/2.5/weather', {
      params: {
        lat: location.latitude,
        lon: location.longitude,
        units: 'metric',
      },
    });
  });

  it.each([
    [401, OPENWEATHER_CLIENT_ERROR_FIXTURE, 'client_error'],
    [503, OPENWEATHER_SERVER_ERROR_FIXTURE, 'server_error'],
  ] as const)(
    'maps HTTP %s responses to a typed provider error',
    async (status, payload, code) => {
      get.mockResolvedValue(response(status, payload));

      const promise = adapter.getCurrentWeather(location);

      await expect(promise).rejects.toMatchObject({
        constructor: WeatherDataProviderHttpError,
        status,
        code,
        responseBody: payload,
      });
    },
  );

  it('maps Axios timeouts to a typed timeout error', async () => {
    get.mockRejectedValue(new AxiosError('timeout exceeded', 'ECONNABORTED'));

    await expect(adapter.getCurrentWeather(location)).rejects.toMatchObject({
      constructor: WeatherDataProviderTimeoutError,
      code: 'timeout',
      timeoutMs,
    });
  });

  it('rejects invalid OpenWeather payloads with a typed error', async () => {
    get.mockResolvedValue(response(200, OPENWEATHER_INVALID_PAYLOAD_FIXTURE));

    await expect(adapter.getCurrentWeather(location)).rejects.toBeInstanceOf(
      WeatherDataProviderInvalidPayloadError,
    );
  });
});

function response(status: number, data: unknown): AxiosResponse<unknown> {
  return {
    status,
    data,
    statusText: String(status),
    headers: {},
    config: {
      headers: {} as never,
    },
  };
}
