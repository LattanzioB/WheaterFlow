import type { ClimateAlertDetectedMessage } from './climate-alert-detected.message';
import { AlertType } from './alert-type';

describe('ClimateAlertDetectedMessage', () => {
  it('uses serializable primitives for the cross-service alert payload', () => {
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
    };

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
    });
  });
});
