import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { StationStatus } from '../../domain/value-objects/station-status.enum';
import { CreateStationDto, UpdateStationDto } from './station.dto';
import { WeatherProviderCode } from '../../domain/value-objects/weather-provider.value-object';

describe('station DTOs', () => {
  it('accepts a valid create payload', async () => {
    const dto = plainToInstance(CreateStationDto, {
      name: 'Central',
      location: {
        latitude: -34.6037,
        longitude: -58.3816,
      },
      sensorModel: 'WH-1080',
      status: StationStatus.ACTIVE,
      provider: WeatherProviderCode.OPENWEATHER,
    });

    await expect(validate(dto)).resolves.toEqual([]);
  });

  it('rejects invalid coordinates', async () => {
    const dto = plainToInstance(CreateStationDto, {
      name: 'Central',
      location: {
        latitude: -100,
        longitude: 200,
      },
      sensorModel: 'WH-1080',
    });

    const errors = await validate(dto);

    expect(errors.map((error) => error.property)).toContain('location');
  });

  it('accepts partial station updates', async () => {
    const dto = plainToInstance(UpdateStationDto, {
      sensorModel: 'Davis',
      provider: WeatherProviderCode.NONE,
    });

    await expect(validate(dto)).resolves.toEqual([]);
  });

  it('rejects unsupported station providers', async () => {
    const dto = plainToInstance(CreateStationDto, {
      name: 'Central',
      location: {
        latitude: -34.6037,
        longitude: -58.3816,
      },
      sensorModel: 'WH-1080',
      provider: 'unsupported',
    });

    const errors = await validate(dto);

    expect(errors.map((error) => error.property)).toContain('provider');
  });
});
