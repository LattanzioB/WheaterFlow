import { ApiProperty } from '@nestjs/swagger';
import { StationStatus } from '../../domain/value-objects/station-status.enum';

export class StationLocationResponseDto {
  @ApiProperty({
    description: 'Latitude of the weather station.',
    example: -34.6037,
  })
  latitude!: number;

  @ApiProperty({
    description: 'Longitude of the weather station.',
    example: -58.3816,
  })
  longitude!: number;
}

export class StationAlertSettingsResponseDto {
  @ApiProperty({
    description: 'Whether extreme heat alerts are enabled for the station.',
    example: true,
  })
  extremeHeat!: boolean;

  @ApiProperty({
    description: 'Whether frost alerts are enabled for the station.',
    example: true,
  })
  frost!: boolean;

  @ApiProperty({
    description: 'Whether storm alerts are enabled for the station.',
    example: true,
  })
  storm!: boolean;

  @ApiProperty({
    description: 'Whether critical humidity alerts are enabled for the station.',
    example: true,
  })
  criticalHumidity!: boolean;
}

export class StationResponseDto {
  @ApiProperty({
    description: 'Unique identifier for the weather station.',
    example: 'station-1',
  })
  id!: string;

  @ApiProperty({
    description: 'Human-readable station name.',
    example: 'Central Station',
  })
  name!: string;

  @ApiProperty({
    description: 'Geographic location of the station.',
    type: () => StationLocationResponseDto,
  })
  location!: StationLocationResponseDto;

  @ApiProperty({
    description: 'Sensor model registered for the station.',
    example: 'Davis Vantage Pro2',
  })
  sensorModel!: string;

  @ApiProperty({
    description: 'Current operational status of the station.',
    enum: StationStatus,
    example: StationStatus.ACTIVE,
  })
  status!: StationStatus;

  @ApiProperty({
    description: 'Owner user identifier for the station.',
    example: 'user-1',
  })
  ownerId!: string;

  @ApiProperty({
    description: 'Configured alert settings for the station.',
    type: () => StationAlertSettingsResponseDto,
  })
  alertSettings!: StationAlertSettingsResponseDto;

  @ApiProperty({
    description: 'ISO timestamp when the station was created.',
    example: '2026-04-25T12:00:00.000Z',
  })
  createdAt!: string;
}
