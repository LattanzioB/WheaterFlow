import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
} from '@nestjs/common';
import {
  STATION_REPOSITORY_TOKEN,
  USER_REPOSITORY_TOKEN,
} from '@shared/tokens/injection-tokens';
import { User } from '../../modules/users/domain/entities/user.entity';
import type { IUserRepository } from '../../modules/users/domain/ports/user-repository.port';
import { Email } from '../../modules/users/domain/value-objects/email.value-object';
import { UserRole } from '../../modules/users/domain/value-objects/user-role.enum';
import { WeatherStation } from '../../modules/stations/domain/entities/weather-station.entity';
import type { IStationRepository } from '../../modules/stations/domain/ports/station-repository.port';
import { Location } from '../../modules/stations/domain/value-objects/location.value-object';
import {
  WeatherProvider,
  WeatherProviderCode,
} from '../../modules/stations/domain/value-objects/weather-provider.value-object';

export const SYSTEM_OWNER_ID = 'weatherflow-system-owner';
export const SYSTEM_OWNER_EMAIL = 'system@weatherflow.local';

export const DEFAULT_OPENWEATHER_STATIONS = [
  {
    id: 'default-openweather-unq',
    name: 'Universidad Nacional de Quilmes',
    latitude: -34.7206,
    longitude: -58.2659,
  },
  {
    id: 'default-openweather-buenos-aires',
    name: 'Buenos Aires',
    latitude: -34.6037,
    longitude: -58.3816,
  },
  {
    id: 'default-openweather-bariloche',
    name: 'Bariloche',
    latitude: -41.1335,
    longitude: -71.3103,
  },
] as const;

@Injectable()
export class DefaultStationsBootstrap implements OnApplicationBootstrap {
  private readonly logger = new Logger(DefaultStationsBootstrap.name);

  constructor(
    @Inject(USER_REPOSITORY_TOKEN)
    private readonly userRepository: IUserRepository,
    @Inject(STATION_REPOSITORY_TOKEN)
    private readonly stationRepository: IStationRepository,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.seed();
  }

  async seed(): Promise<void> {
    const ownerId = await this.ensureSystemOwner();
    let createdStations = 0;

    for (const definition of DEFAULT_OPENWEATHER_STATIONS) {
      const existing = await this.stationRepository.findById(definition.id);

      if (existing) {
        continue;
      }

      await this.stationRepository.save(
        WeatherStation.create({
          id: definition.id,
          name: definition.name,
          location: Location.create(definition.latitude, definition.longitude),
          sensorModel: 'OpenWeatherMap',
          ownerId,
          provider: WeatherProvider.create(WeatherProviderCode.OPENWEATHER),
        }),
      );
      createdStations += 1;
    }

    if (createdStations > 0) {
      this.logger.log(
        `Created ${createdStations} default OpenWeather station(s)`,
      );
    }
  }

  private async ensureSystemOwner(): Promise<string> {
    const email = Email.create(SYSTEM_OWNER_EMAIL);
    const existing = await this.userRepository.findByEmail(email);

    if (existing) {
      return existing.getId();
    }

    const owner = User.create({
      id: SYSTEM_OWNER_ID,
      name: 'WeatherFlow',
      lastName: 'System',
      email,
      passwordHash: 'SYSTEM_ACCOUNT_DISABLED',
      role: UserRole.ADMIN,
    });

    await this.userRepository.save(owner);
    this.logger.log('Created the WeatherFlow system owner');

    return owner.getId();
  }
}
