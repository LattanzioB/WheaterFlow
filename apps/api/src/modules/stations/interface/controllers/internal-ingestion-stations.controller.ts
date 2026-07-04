import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { IngestionSystemTokenGuard } from '../../../../shared/guards/ingestion-system-token.guard';
import { ListAllStationsService } from '../../application/services/list-all-stations.service';
import { WeatherProviderCode } from '../../domain/value-objects/weather-provider.value-object';
import { StationResponseDto } from '../dtos/station.dto';

@ApiTags('Internal Ingestion')
@ApiSecurity('ingestion-system-token')
@Controller('internal/ingestion/stations')
@UseGuards(IngestionSystemTokenGuard)
export class InternalIngestionStationsController {
  constructor(
    private readonly listAllStationsService: ListAllStationsService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'List provider=openweather stations for the ingestion catalog.',
  })
  @ApiOkResponse({ type: StationResponseDto, isArray: true })
  async listOpenWeatherStations(): Promise<StationResponseDto[]> {
    const stations = await this.listAllStationsService.execute({
      provider: WeatherProviderCode.OPENWEATHER,
    });

    return stations.map((station) => ({
      id: station.getId(),
      name: station.getName(),
      location: {
        latitude: station.getLocation().getLatitude(),
        longitude: station.getLocation().getLongitude(),
      },
      sensorModel: station.getSensorModel(),
      status: station.getStatus(),
      ownerId: station.getOwnerId(),
      provider: station.getProvider().getValue(),
      alertSettings: station.getAlertSettings().toPrimitives(),
      createdAt: station.getCreatedAt().toISOString(),
    }));
  }
}
