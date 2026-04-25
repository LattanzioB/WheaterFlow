import { AlertType } from '../value-objects/alert-type.enum';

export class MeasurementAlertDetectedEvent {
  static readonly EVENT_NAME = 'measurement.alert.detected';

  constructor(
    public readonly measurementId: string,
    public readonly stationId: string,
    public readonly alertType: AlertType,
  ) {}
}
