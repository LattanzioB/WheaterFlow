import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { StationStatus } from '../../domain/value-objects/station-status.enum';
import { WeatherProviderCode } from '../../domain/value-objects/weather-provider.value-object';

@Schema({ _id: false, id: false })
export class StationLocationDocument {
  @Prop({ type: Number, required: true, min: -90, max: 90 })
  latitude!: number;

  @Prop({ type: Number, required: true, min: -180, max: 180 })
  longitude!: number;
}

@Schema({ _id: false, id: false })
export class StationAlertSettingsDocument {
  @Prop({ type: Boolean, required: true, default: true })
  extremeHeat!: boolean;

  @Prop({ type: Boolean, required: true, default: true })
  frost!: boolean;

  @Prop({ type: Boolean, required: true, default: true })
  storm!: boolean;

  @Prop({ type: Boolean, required: true, default: true })
  criticalHumidity!: boolean;
}

@Schema({
  collection: 'weather_stations',
  timestamps: false,
  versionKey: false,
})
export class WeatherStationPersistenceModel {
  @Prop({ type: String, required: true, trim: true })
  _id!: string;

  @Prop({ type: String, required: true, trim: true })
  name!: string;

  @Prop({ type: StationLocationDocument, required: true })
  location!: StationLocationDocument;

  @Prop({ type: String, required: true, trim: true })
  sensorModel!: string;

  @Prop({
    type: String,
    required: true,
    enum: Object.values(StationStatus),
    default: StationStatus.ACTIVE,
  })
  status!: StationStatus;

  @Prop({ type: String, required: true, trim: true })
  ownerId!: string;

  @Prop({
    type: String,
    required: true,
    enum: Object.values(WeatherProviderCode),
    default: WeatherProviderCode.NONE,
  })
  provider!: WeatherProviderCode;

  @Prop({
    type: StationAlertSettingsDocument,
    required: true,
    default: () => ({
      extremeHeat: true,
      frost: true,
      storm: true,
      criticalHumidity: true,
    }),
  })
  alertSettings!: StationAlertSettingsDocument;

  @Prop({ type: Date, required: true })
  createdAt!: Date;
}

export interface WeatherStationPersistence {
  _id: string;
  name: string;
  location: {
    latitude: number;
    longitude: number;
  };
  sensorModel: string;
  status: StationStatus;
  ownerId: string;
  provider?: WeatherProviderCode;
  alertSettings: {
    extremeHeat: boolean;
    frost: boolean;
    storm: boolean;
    criticalHumidity: boolean;
  };
  createdAt: Date;
}

export type WeatherStationModelDocument =
  HydratedDocument<WeatherStationPersistenceModel>;

export const WeatherStationSchema = SchemaFactory.createForClass(
  WeatherStationPersistenceModel,
);

WeatherStationSchema.index({ ownerId: 1 });
