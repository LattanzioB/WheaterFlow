import {
  type ClimateAlertDetectedMessage,
  validateClimateAlertDetectedMessage,
} from './climate-alert-detected.message';
import { AlertType } from './alert-type';

describe('ClimateAlertDetectedMessage', () => {
  const message: ClimateAlertDetectedMessage = {
    messageId: 'message-1',
    occurredAt: '2026-04-25T17:00:01.000Z',
    measurementId: 'measurement-1',
    stationId: 'station-1',
    stationName: 'Central',
    alertType: AlertType.EXTREME_HEAT,
    reportedAt: '2026-04-25T17:00:00.000Z',
    temperature: 41,
    humidity: 65,
    pressure: 1005,
    correlationId: 'cycle-1',
  };

  it('uses serializable primitives for the cross-service alert payload', () => {
    expect(message).toEqual({
      messageId: 'message-1',
      occurredAt: '2026-04-25T17:00:01.000Z',
      measurementId: 'measurement-1',
      stationId: 'station-1',
      stationName: 'Central',
      alertType: AlertType.EXTREME_HEAT,
      reportedAt: '2026-04-25T17:00:00.000Z',
      temperature: 41,
      humidity: 65,
      pressure: 1005,
      correlationId: 'cycle-1',
    });
  });

  it('validates a complete climate alert message', () => {
    expect(validateClimateAlertDetectedMessage(message)).toEqual({
      valid: true,
      errors: [],
      message,
    });
  });

  it('rejects malformed messages before they cross the service boundary', () => {
    const result = validateClimateAlertDetectedMessage({
      ...message,
      stationId: '',
      alertType: AlertType.NONE,
      reportedAt: 'not-a-date',
      temperature: Number.NaN,
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        'stationId must be a non-empty string',
        'alertType must be a supported climate alert type',
        'reportedAt must be a valid ISO date string',
        'temperature must be a finite number',
      ]),
    );
  });

  it('rejects an empty optional correlation identifier', () => {
    const result = validateClimateAlertDetectedMessage({
      ...message,
      correlationId: ' ',
    });

    expect(result.errors).toContain(
      'correlationId must be a non-empty string when provided',
    );
  });
});
