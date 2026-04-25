import { WeatherStation } from '../entities/weather-station.entity';

export interface IStationRepository {
  findById(id: string): Promise<WeatherStation | null>;
  findByOwnerId(ownerId: string): Promise<WeatherStation[]>;
  save(station: WeatherStation): Promise<void>;
  delete(id: string): Promise<void>;
  findAll(): Promise<WeatherStation[]>;
}
