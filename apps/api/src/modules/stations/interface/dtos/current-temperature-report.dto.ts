import { ApiProperty } from '@nestjs/swagger';

class CurrentTemperatureReportStationDto {
  @ApiProperty({ example: 'station-123' })
  id!: string;

  @ApiProperty({ example: 'Buenos Aires' })
  name!: string;
}

class CurrentTemperatureDto {
  @ApiProperty({ example: 18.4 })
  value!: number;

  @ApiProperty({ example: 'celsius' })
  unit!: 'celsius';
}

export class CurrentTemperatureReportDto {
  @ApiProperty({ type: () => CurrentTemperatureReportStationDto })
  station!: CurrentTemperatureReportStationDto;

  @ApiProperty({ type: () => CurrentTemperatureDto })
  temperature!: CurrentTemperatureDto;

  @ApiProperty({ example: '2026-06-26T12:00:00.000Z' })
  observedAt!: string;

  @ApiProperty({ example: '2026-06-26T12:00:01.250Z' })
  fetchedAt!: string;
}
