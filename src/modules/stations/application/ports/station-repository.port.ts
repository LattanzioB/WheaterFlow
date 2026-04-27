import { WeatherStation } from '../../domain/entities/weather-station.entity';

export interface IStationRepository {
  findById(id: string): Promise<WeatherStation | null>;
  findByIds(ids: string[]): Promise<WeatherStation[]>;
  findByOwnerId(ownerId: string): Promise<WeatherStation[]>;
  save(station: WeatherStation): Promise<void>;
  delete(id: string): Promise<void>;
  findAll(): Promise<WeatherStation[]>;
}
