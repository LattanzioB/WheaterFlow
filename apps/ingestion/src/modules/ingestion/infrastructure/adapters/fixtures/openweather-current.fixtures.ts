export const OPENWEATHER_CURRENT_SUCCESS_FIXTURE = {
  coord: {
    lon: -58.3816,
    lat: -34.6037,
  },
  weather: [
    {
      id: 800,
      main: 'Clear',
      description: 'clear sky',
      icon: '01d',
    },
  ],
  main: {
    temp: 18.42,
    feels_like: 17.95,
    temp_min: 17.81,
    temp_max: 19.14,
    pressure: 1017,
    humidity: 63,
  },
  dt: 1_718_978_400,
  id: 3_435_910,
  name: 'Buenos Aires',
  cod: 200,
};

export const OPENWEATHER_INVALID_PAYLOAD_FIXTURE = {
  ...OPENWEATHER_CURRENT_SUCCESS_FIXTURE,
  main: {
    ...OPENWEATHER_CURRENT_SUCCESS_FIXTURE.main,
    humidity: '63',
  },
};

export const OPENWEATHER_CLIENT_ERROR_FIXTURE = {
  cod: 401,
  message: 'Invalid API key',
};

export const OPENWEATHER_SERVER_ERROR_FIXTURE = {
  cod: 503,
  message: 'Service unavailable',
};
