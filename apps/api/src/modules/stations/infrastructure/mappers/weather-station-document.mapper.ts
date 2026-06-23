import { WeatherStation } from '../../domain/entities/weather-station.entity';
import { Location } from '../../domain/value-objects/location.value-object';
import { StationAlertSettings } from '../../domain/value-objects/station-alert-settings.value-object';
import {
  WeatherProvider,
  WeatherProviderCode,
} from '../../domain/value-objects/weather-provider.value-object';
import {
  WeatherStationModelDocument,
  WeatherStationPersistence,
} from '../persistence/weather-station.schema';

export class WeatherStationDocumentMapper {
  static toPersistence(station: WeatherStation): WeatherStationPersistence {
    return {
      _id: station.getId(),
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
      createdAt: station.getCreatedAt(),
    };
  }

  static toDomain(
    document: WeatherStationPersistence | WeatherStationModelDocument,
  ): WeatherStation {
    return WeatherStation.create({
      id: document._id,
      name: document.name,
      location: Location.create(
        document.location.latitude,
        document.location.longitude,
      ),
      sensorModel: document.sensorModel,
      status: document.status,
      ownerId: document.ownerId,
      provider: WeatherProvider.create(
        document.provider ?? WeatherProviderCode.NONE,
      ),
      alertSettings: StationAlertSettings.create(document.alertSettings),
      createdAt: document.createdAt,
    });
  }
}
