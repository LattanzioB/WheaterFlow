export type CurrentWeatherLocationQuery = {
  latitude: number;
  longitude: number;
};

export type CurrentWeatherReadingResponse = {
  externalId: string;
  temperature: {
    value: number;
    unit: 'celsius';
  };
  humidity: {
    value: number;
    unit: 'percent';
  };
  pressure: {
    value: number;
    unit: 'hPa';
  };
  observedAt: string;
};

export type CurrentTemperatureReportResponse = {
  station: {
    id: string;
    name: string;
  };
  temperature: {
    value: number;
    unit: 'celsius';
  };
  observedAt: string;
  fetchedAt: string;
};
