import { randomUUID } from 'node:crypto';
import { AlertType } from '../value-objects/alert-type.enum';
import { Humidity } from '../value-objects/humidity.value-object';
import { Pressure } from '../value-objects/pressure.value-object';
import { Temperature } from '../value-objects/temperature.value-object';

export interface CreateMeasurementProps {
  id?: string;
  stationId: string;
  temperature: Temperature;
  humidity: Humidity;
  pressure: Pressure;
  reportedAt?: Date;
  alertStatus?: boolean;
  alertType?: AlertType;
}

export class Measurement {
  private constructor(
    private readonly id: string,
    private readonly stationId: string,
    private readonly temperature: Temperature,
    private readonly humidity: Humidity,
    private readonly pressure: Pressure,
    private readonly reportedAt: Date,
    private alertStatus: boolean,
    private alertType: AlertType,
  ) {}

  static create(props: CreateMeasurementProps): Measurement {
    const id = props.id
      ? Measurement.normalizeReference(props.id, 'Measurement id')
      : randomUUID();
    const stationId = Measurement.normalizeReference(
      props.stationId,
      'Station id',
    );
    const reportedAt = props.reportedAt ?? new Date();

    if (Number.isNaN(reportedAt.getTime())) {
      throw new Error('Reported at must be a valid date');
    }

    const alertType = props.alertType ?? AlertType.NONE;
    const alertStatus = props.alertStatus ?? alertType !== AlertType.NONE;

    if (!alertStatus && alertType !== AlertType.NONE) {
      throw new Error('Alert type must be NONE when alert status is false');
    }

    return new Measurement(
      id,
      stationId,
      props.temperature,
      props.humidity,
      props.pressure,
      reportedAt,
      alertStatus,
      alertType,
    );
  }

  getId(): string {
    return this.id;
  }

  getStationId(): string {
    return this.stationId;
  }

  getTemperature(): Temperature {
    return this.temperature;
  }

  getHumidity(): Humidity {
    return this.humidity;
  }

  getPressure(): Pressure {
    return this.pressure;
  }

  getReportedAt(): Date {
    return this.reportedAt;
  }

  hasAlert(): boolean {
    return this.alertStatus;
  }

  getAlertType(): AlertType {
    return this.alertType;
  }

  applyAlert(alertType: AlertType): void {
    if (alertType === AlertType.NONE) {
      this.clearAlert();
      return;
    }

    this.alertStatus = true;
    this.alertType = alertType;
  }

  clearAlert(): void {
    this.alertStatus = false;
    this.alertType = AlertType.NONE;
  }

  private static normalizeReference(value: string, field: string): string {
    const normalized = value.trim();

    if (!normalized) {
      throw new Error(`${field} cannot be empty`);
    }

    return normalized;
  }
}
