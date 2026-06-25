import { IngestionCycleAlreadyRunningError } from '../../domain/errors/ingestion-cycle.errors';
import type { WeatherDataProvider } from '../../domain/ports/weather-data-provider.port';
import type {
  IngestionStation,
  WeatherStationCatalog,
} from '../../domain/ports/weather-station-catalog.port';
import { RunIngestionCycleService } from './run-ingestion-cycle.service';

const activeStation = (id: string): IngestionStation => ({
  id,
  name: `Station ${id}`,
  location: { latitude: -34.6, longitude: -58.4 },
  status: 'Activa',
  provider: 'openweather',
});

describe('RunIngestionCycleService', () => {
  it('continues after an individual failure and reports every outcome', async () => {
    const stations: IngestionStation[] = [
      activeStation('1'),
      activeStation('2'),
      { ...activeStation('3'), status: 'Inactiva' },
    ];
    const stationCatalog: WeatherStationCatalog = {
      listOpenWeatherStations: jest.fn().mockResolvedValue(stations),
    };
    const weatherDataProvider: WeatherDataProvider = {
      getCurrentWeather: jest
        .fn()
        .mockResolvedValueOnce({
          externalId: 'owm-1',
          temperature: { value: 20, unit: 'celsius' },
          humidity: { value: 60, unit: 'percent' },
          pressure: { value: 1010, unit: 'hPa' },
          observedAt: new Date('2026-06-25T12:00:00.000Z'),
        })
        .mockRejectedValueOnce(new Error('provider unavailable')),
    };
    const service = new RunIngestionCycleService(
      stationCatalog,
      weatherDataProvider,
      2,
    );

    const summary = await service.execute('manual');

    expect(summary).toMatchObject({
      trigger: 'manual',
      discovered: 3,
      succeeded: 1,
      failed: 1,
      skipped: 1,
    });
    expect(summary.results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ stationId: '1', status: 'succeeded' }),
        expect.objectContaining({ stationId: '2', status: 'failed' }),
        expect.objectContaining({ stationId: '3', status: 'skipped' }),
      ]),
    );
  });

  it('limits concurrent OpenWeather requests', async () => {
    let active = 0;
    let peak = 0;
    const stationCatalog: WeatherStationCatalog = {
      listOpenWeatherStations: jest
        .fn()
        .mockResolvedValue(['1', '2', '3', '4'].map(activeStation)),
    };
    const weatherDataProvider: WeatherDataProvider = {
      getCurrentWeather: jest.fn().mockImplementation(async () => {
        active += 1;
        peak = Math.max(peak, active);
        await new Promise((resolve) => setTimeout(resolve, 5));
        active -= 1;
        return {
          externalId: 'owm',
          temperature: { value: 20, unit: 'celsius' },
          humidity: { value: 60, unit: 'percent' },
          pressure: { value: 1010, unit: 'hPa' },
          observedAt: new Date(),
        };
      }),
    };
    const service = new RunIngestionCycleService(
      stationCatalog,
      weatherDataProvider,
      2,
    );

    await service.execute('scheduled');

    expect(peak).toBe(2);
  });

  it('prevents overlapping cycles', async () => {
    let releaseCatalog!: () => void;
    const stationCatalog: WeatherStationCatalog = {
      listOpenWeatherStations: jest.fn(
        () =>
          new Promise<IngestionStation[]>((resolve) => {
            releaseCatalog = () => resolve([]);
          }),
      ),
    };
    const service = new RunIngestionCycleService(
      stationCatalog,
      { getCurrentWeather: jest.fn() },
      1,
    );

    const runningCycle = service.execute('scheduled');
    await expect(service.execute('manual')).rejects.toBeInstanceOf(
      IngestionCycleAlreadyRunningError,
    );
    releaseCatalog();
    await runningCycle;
  });
});
