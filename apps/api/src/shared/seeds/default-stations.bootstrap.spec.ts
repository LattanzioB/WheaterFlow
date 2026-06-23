import { User } from '../../modules/users/domain/entities/user.entity';
import { IUserRepository } from '../../modules/users/domain/ports/user-repository.port';
import { IStationRepository } from '../../modules/stations/domain/ports/station-repository.port';
import { WeatherStation } from '../../modules/stations/domain/entities/weather-station.entity';
import { WeatherProviderCode } from '../../modules/stations/domain/value-objects/weather-provider.value-object';
import {
  DEFAULT_OPENWEATHER_STATIONS,
  DefaultStationsBootstrap,
  SYSTEM_OWNER_EMAIL,
} from './default-stations.bootstrap';

describe('DefaultStationsBootstrap', () => {
  it('creates the system owner and exactly three stations idempotently', async () => {
    const users = new Map<string, User>();
    const stations = new Map<string, WeatherStation>();

    const userRepository: jest.Mocked<IUserRepository> = {
      findById: jest.fn((id) => Promise.resolve(users.get(id) ?? null)),
      findByEmail: jest.fn((email) =>
        Promise.resolve(
          [...users.values()].find((user) => user.getEmail().equals(email)) ??
            null,
        ),
      ),
      save: jest.fn((user) => {
        users.set(user.getId(), user);
        return Promise.resolve();
      }),
      delete: jest.fn((id) => {
        users.delete(id);
        return Promise.resolve();
      }),
      findAll: jest.fn(() => Promise.resolve([...users.values()])),
    };
    const stationRepository: jest.Mocked<IStationRepository> = {
      findById: jest.fn((id) => Promise.resolve(stations.get(id) ?? null)),
      findByIds: jest.fn((ids) =>
        Promise.resolve(
          ids
            .map((id) => stations.get(id))
            .filter((station): station is WeatherStation => Boolean(station)),
        ),
      ),
      findByOwnerId: jest.fn((ownerId) =>
        Promise.resolve(
          [...stations.values()].filter(
            (station) => station.getOwnerId() === ownerId,
          ),
        ),
      ),
      save: jest.fn((station) => {
        stations.set(station.getId(), station);
        return Promise.resolve();
      }),
      delete: jest.fn((id) => {
        stations.delete(id);
        return Promise.resolve();
      }),
      findAll: jest.fn(() => Promise.resolve([...stations.values()])),
      findWithFilters: jest.fn(() => Promise.resolve([...stations.values()])),
    };
    const bootstrap = new DefaultStationsBootstrap(
      userRepository,
      stationRepository,
    );

    await bootstrap.seed();
    await bootstrap.seed();

    expect(users.size).toBe(1);
    expect([...users.values()][0].getEmail().getValue()).toBe(
      SYSTEM_OWNER_EMAIL,
    );
    expect(stations.size).toBe(DEFAULT_OPENWEATHER_STATIONS.length);
    expect(stationRepository.save).toHaveBeenCalledTimes(3);
    expect(userRepository.save).toHaveBeenCalledTimes(1);

    for (const definition of DEFAULT_OPENWEATHER_STATIONS) {
      const station = stations.get(definition.id);

      expect(station?.getName()).toBe(definition.name);
      expect(station?.getLocation().getLatitude()).toBe(definition.latitude);
      expect(station?.getLocation().getLongitude()).toBe(definition.longitude);
      expect(station?.getProvider().getValue()).toBe(
        WeatherProviderCode.OPENWEATHER,
      );
    }
  });
});
