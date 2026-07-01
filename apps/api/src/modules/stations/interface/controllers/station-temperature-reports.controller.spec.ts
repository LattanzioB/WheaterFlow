import {
  BadGatewayException,
  GatewayTimeoutException,
  NotFoundException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  ApiToIngestionBulkheadRejectedError,
  ApiToIngestionTimeoutError,
} from '../../../../shared/ingestion/api-to-ingestion-current-weather.client';
import {
  GetCurrentTemperatureReportService,
  UnsupportedCurrentTemperatureProviderError,
} from '../../application/services/get-current-temperature-report.service';
import { WeatherProviderCode } from '../../domain/value-objects/weather-provider.value-object';
import { StationTemperatureReportsController } from './station-temperature-reports.controller';

describe('StationTemperatureReportsController', () => {
  const buildService = () =>
    ({
      execute: jest.fn(),
    }) as unknown as jest.Mocked<GetCurrentTemperatureReportService>;

  it('returns the current temperature report for an authenticated API client', async () => {
    const service = buildService();
    const controller = new StationTemperatureReportsController(service);
    service.execute.mockResolvedValue({
      station: { id: 'station-1', name: 'Buenos Aires' },
      temperature: { value: 18.4, unit: 'celsius' },
      observedAt: '2026-06-26T12:00:00.000Z',
      fetchedAt: '2026-06-26T12:00:01.000Z',
    });

    await expect(
      controller.getCurrentTemperature('station-1'),
    ).resolves.toMatchObject({
      station: { id: 'station-1' },
      temperature: { unit: 'celsius' },
    });
    expect(service.execute).toHaveBeenCalledWith({ stationId: 'station-1' });
  });

  it('maps missing stations to 404', async () => {
    const service = buildService();
    const controller = new StationTemperatureReportsController(service);
    service.execute.mockRejectedValue(new Error('Station not found'));

    await expect(
      controller.getCurrentTemperature('missing'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('maps non OpenWeather stations to 422', async () => {
    const service = buildService();
    const controller = new StationTemperatureReportsController(service);
    service.execute.mockRejectedValue(
      new UnsupportedCurrentTemperatureProviderError(WeatherProviderCode.NONE),
    );

    await expect(
      controller.getCurrentTemperature('station-1'),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('maps ingestion timeout and saturation to public errors', async () => {
    const service = buildService();
    const controller = new StationTemperatureReportsController(service);

    service.execute.mockRejectedValueOnce(new ApiToIngestionTimeoutError());
    await expect(
      controller.getCurrentTemperature('station-1'),
    ).rejects.toBeInstanceOf(GatewayTimeoutException);

    service.execute.mockRejectedValueOnce(
      new ApiToIngestionBulkheadRejectedError(10),
    );
    await expect(
      controller.getCurrentTemperature('station-1'),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('hides unexpected ingestion details behind 502', async () => {
    const service = buildService();
    const controller = new StationTemperatureReportsController(service);
    service.execute.mockRejectedValue(new Error('internal provider stack'));

    await expect(
      controller.getCurrentTemperature('station-1'),
    ).rejects.toBeInstanceOf(BadGatewayException);
  });
});
