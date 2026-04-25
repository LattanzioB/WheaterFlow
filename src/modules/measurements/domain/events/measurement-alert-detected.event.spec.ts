import { MeasurementAlertDetectedEvent } from './measurement-alert-detected.event';
import { AlertType } from '../value-objects/alert-type.enum';

describe('MeasurementAlertDetectedEvent', () => {
  it('exposes the canonical event name and payload', () => {
    const event = new MeasurementAlertDetectedEvent(
      'measurement-1',
      'station-1',
      AlertType.STORM,
    );

    expect(MeasurementAlertDetectedEvent.EVENT_NAME).toBe(
      'measurement.alert.detected',
    );
    expect(event.measurementId).toBe('measurement-1');
    expect(event.stationId).toBe('station-1');
    expect(event.alertType).toBe(AlertType.STORM);
  });
});
