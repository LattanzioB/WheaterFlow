import { ApiProperty } from '@nestjs/swagger';

class TemperatureAverageReportStationDto {
  @ApiProperty({ example: 'station-uuid' })
  id!: string;

  @ApiProperty({ example: 'Buenos Aires' })
  name!: string;
}

class TemperatureAverageReportPeriodDto {
  @ApiProperty({ example: '2026-06-29T12:00:00.000Z' })
  from!: string;

  @ApiProperty({ example: '2026-06-30T12:00:00.000Z' })
  to!: string;
}

class TemperatureAverageValueDto {
  @ApiProperty({
    example: 18.75,
    nullable: true,
    description:
      'Average temperature in Celsius, or null when the period has no samples.',
  })
  value!: number | null;

  @ApiProperty({ example: 'celsius' })
  unit!: 'celsius';
}

export class TemperatureAverageReportDto {
  @ApiProperty({ type: () => TemperatureAverageReportStationDto })
  station!: TemperatureAverageReportStationDto;

  @ApiProperty({ type: () => TemperatureAverageReportPeriodDto })
  period!: TemperatureAverageReportPeriodDto;

  @ApiProperty({ type: () => TemperatureAverageValueDto })
  average!: TemperatureAverageValueDto;

  @ApiProperty({
    example: 12,
    description:
      'Number of persisted measurements included in the moving UTC period.',
  })
  sampleCount!: number;
}
