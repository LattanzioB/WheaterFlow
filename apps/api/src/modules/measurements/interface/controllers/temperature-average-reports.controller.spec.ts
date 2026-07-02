import { NotFoundException } from '@nestjs/common';
import { GetTemperatureAverageReportService } from '../../application/services/get-temperature-average-report.service';
import { TemperatureAverageReportsController } from './temperature-average-reports.controller';

describe('TemperatureAverageReportsController', () => {
  const buildService = () =>
    ({
      execute: jest.fn(),
    }) as unknown as jest.Mocked<GetTemperatureAverageReportService>;

  const response = {
    station: { id: 'station-1', name: 'Buenos Aires' },
    period: {
      from: '2026-06-29T12:00:00.000Z',
      to: '2026-06-30T12:00:00.000Z',
    },
    average: { value: 18.75, unit: 'celsius' as const },
    sampleCount: 2,
  };

  it('routes daily averages to the 24 hour use case', async () => {
    const service = buildService();
    const controller = new TemperatureAverageReportsController(service);
    service.execute.mockResolvedValue(response);

    await expect(controller.getDailyAverage('station-1')).resolves.toEqual(
      response,
    );
    expect(service.execute).toHaveBeenCalledWith({
      stationId: 'station-1',
      window: 'daily',
    });
  });

  it('routes weekly averages to the 7 day use case', async () => {
    const service = buildService();
    const controller = new TemperatureAverageReportsController(service);
    service.execute.mockResolvedValue(response);

    await expect(controller.getWeeklyAverage('station-1')).resolves.toEqual(
      response,
    );
    expect(service.execute).toHaveBeenCalledWith({
      stationId: 'station-1',
      window: 'weekly',
    });
  });

  it('maps missing stations to 404', async () => {
    const service = buildService();
    const controller = new TemperatureAverageReportsController(service);
    service.execute.mockRejectedValue(new Error('Station not found'));

    await expect(controller.getDailyAverage('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
