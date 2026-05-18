import { randomUUID } from 'node:crypto';
import { Location } from '../value-objects/location.value-object';
import {
  StationAlertSettings,
  StationAlertSettingsProps,
} from '../value-objects/station-alert-settings.value-object';
import { StationStatus } from '../value-objects/station-status.enum';

export interface CreateWeatherStationProps {
  id?: string;
  name: string;
  location: Location;
  sensorModel: string;
  status?: StationStatus;
  ownerId: string;
  alertSettings?: StationAlertSettings;
  createdAt?: Date;
}

export class WeatherStation {
  private constructor(
    private readonly id: string,
    private name: string,
    private location: Location,
    private sensorModel: string,
    private status: StationStatus,
    private ownerId: string,
    private alertSettings: StationAlertSettings,
    private readonly createdAt: Date,
  ) {}

  static create(props: CreateWeatherStationProps): WeatherStation {
    const id = props.id
      ? WeatherStation.normalizeText(props.id, 'Station id')
      : randomUUID();
    const name = WeatherStation.normalizeText(props.name, 'Station name');
    const sensorModel = WeatherStation.normalizeText(
      props.sensorModel,
      'Sensor model',
    );
    const ownerId = WeatherStation.normalizeText(props.ownerId, 'Owner id');
    const createdAt = props.createdAt ?? new Date();

    if (Number.isNaN(createdAt.getTime())) {
      throw new Error('Created at must be a valid date');
    }

    return new WeatherStation(
      id,
      name,
      props.location,
      sensorModel,
      props.status ?? StationStatus.ACTIVE,
      ownerId,
      props.alertSettings ?? StationAlertSettings.create(),
      createdAt,
    );
  }

  getId(): string {
    return this.id;
  }

  getName(): string {
    return this.name;
  }

  getLocation(): Location {
    return this.location;
  }

  getSensorModel(): string {
    return this.sensorModel;
  }

  getStatus(): StationStatus {
    return this.status;
  }

  getOwnerId(): string {
    return this.ownerId;
  }

  getAlertSettings(): StationAlertSettings {
    return this.alertSettings;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }

  rename(name: string): void {
    this.name = WeatherStation.normalizeText(name, 'Station name');
  }

  relocate(location: Location): void {
    this.location = location;
  }

  changeSensorModel(sensorModel: string): void {
    this.sensorModel = WeatherStation.normalizeText(
      sensorModel,
      'Sensor model',
    );
  }

  activate(): void {
    this.status = StationStatus.ACTIVE;
  }

  deactivate(): void {
    this.status = StationStatus.INACTIVE;
  }

  reassignOwner(ownerId: string): void {
    this.ownerId = WeatherStation.normalizeText(ownerId, 'Owner id');
  }

  configureAlerts(props: StationAlertSettingsProps): void {
    this.alertSettings = StationAlertSettings.create(props);
  }

  private static normalizeText(value: string, field: string): string {
    const normalized = value.trim();

    if (!normalized) {
      throw new Error(`${field} cannot be empty`);
    }

    return normalized;
  }
}
