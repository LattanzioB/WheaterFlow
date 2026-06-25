import { Inject, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { IngestionCycleAlreadyRunningError } from '../../domain/errors/ingestion-cycle.errors';
import {
  WEATHER_DATA_PROVIDER_TOKEN,
  type WeatherDataProvider,
  type WeatherDataReading,
} from '../../domain/ports/weather-data-provider.port';
import {
  WEATHER_STATION_CATALOG_TOKEN,
  type IngestionStation,
  type WeatherStationCatalog,
} from '../../domain/ports/weather-station-catalog.port';

export const OWM_CONCURRENCY_LIMIT_TOKEN = 'OpenWeatherConcurrencyLimit';

export type IngestionCycleTrigger = 'scheduled' | 'manual';

export type IngestionStationResult =
  | {
      stationId: string;
      stationName: string;
      status: 'succeeded';
      reading: WeatherDataReading;
    }
  | {
      stationId: string;
      stationName: string;
      status: 'failed';
      error: {
        name: string;
        message: string;
      };
    }
  | {
      stationId: string;
      stationName: string;
      status: 'skipped';
      reason: 'inactive';
    };

export type IngestionCycleSummary = {
  cycleId: string;
  trigger: IngestionCycleTrigger;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  discovered: number;
  succeeded: number;
  failed: number;
  skipped: number;
  results: IngestionStationResult[];
};

@Injectable()
export class RunIngestionCycleService {
  private readonly logger = new Logger(RunIngestionCycleService.name);
  private running = false;

  constructor(
    @Inject(WEATHER_STATION_CATALOG_TOKEN)
    private readonly stationCatalog: WeatherStationCatalog,
    @Inject(WEATHER_DATA_PROVIDER_TOKEN)
    private readonly weatherDataProvider: WeatherDataProvider,
    @Inject(OWM_CONCURRENCY_LIMIT_TOKEN)
    private readonly concurrencyLimit: number,
  ) {}

  async execute(
    trigger: IngestionCycleTrigger,
  ): Promise<IngestionCycleSummary> {
    if (this.running) {
      throw new IngestionCycleAlreadyRunningError();
    }

    this.running = true;
    const cycleId = randomUUID();
    const startedAt = new Date();

    try {
      const stations = await this.stationCatalog.listOpenWeatherStations();
      const inactiveResults = stations
        .filter((station) => station.status !== 'Activa')
        .map<IngestionStationResult>((station) => ({
          stationId: station.id,
          stationName: station.name,
          status: 'skipped',
          reason: 'inactive',
        }));
      const activeStations = stations.filter(
        (station) => station.status === 'Activa',
      );
      const activeResults = await this.mapWithConcurrency(
        activeStations,
        (station) => this.ingestStation(station),
      );
      const results = [...activeResults, ...inactiveResults];
      const completedAt = new Date();
      const summary: IngestionCycleSummary = {
        cycleId,
        trigger,
        startedAt: startedAt.toISOString(),
        completedAt: completedAt.toISOString(),
        durationMs: completedAt.getTime() - startedAt.getTime(),
        discovered: stations.length,
        succeeded: results.filter((result) => result.status === 'succeeded')
          .length,
        failed: results.filter((result) => result.status === 'failed').length,
        skipped: results.filter((result) => result.status === 'skipped').length,
        results,
      };

      this.logger.log(JSON.stringify({ event: 'ingestion_cycle', ...summary }));
      return summary;
    } finally {
      this.running = false;
    }
  }

  private async ingestStation(
    station: IngestionStation,
  ): Promise<IngestionStationResult> {
    try {
      const reading = await this.weatherDataProvider.getCurrentWeather(
        station.location,
      );

      return {
        stationId: station.id,
        stationName: station.name,
        status: 'succeeded',
        reading,
      };
    } catch (error: unknown) {
      const normalizedError =
        error instanceof Error
          ? { name: error.name, message: error.message }
          : { name: 'UnknownError', message: String(error) };

      return {
        stationId: station.id,
        stationName: station.name,
        status: 'failed',
        error: normalizedError,
      };
    }
  }

  private async mapWithConcurrency<T, R>(
    items: T[],
    mapper: (item: T) => Promise<R>,
  ): Promise<R[]> {
    const results = new Array<R>(items.length);
    let nextIndex = 0;

    const worker = async (): Promise<void> => {
      while (nextIndex < items.length) {
        const index = nextIndex;
        nextIndex += 1;
        results[index] = await mapper(items[index]);
      }
    };

    const workers = Array.from(
      { length: Math.min(this.concurrencyLimit, items.length) },
      () => worker(),
    );
    await Promise.all(workers);
    return results;
  }
}
