import { AlertType } from '@contracts/measurements/alert-type';
import { NotificationResponseDto } from './notification-response.dto';

describe('NotificationResponseDto', () => {
  it('exposes notification primitive fields', () => {
    const dto: NotificationResponseDto = {
      id: '4d9784cb-c6a1-4a5d-9c58-fd824f9dbf25',
      userId: 'user-1',
      stationId: 'station-1',
      stationName: 'Central',
      alertType: AlertType.STORM,
      temperature: 25.2,
      humidity: 91,
      pressure: 970,
      reportedAt: '2026-05-01T10:00:00.000Z',
      createdAt: '2026-05-01T10:01:00.000Z',
      readAt: null,
      messageId: 'alert-message-1',
    };

    expect(dto).toEqual(
      expect.objectContaining({
        id: '4d9784cb-c6a1-4a5d-9c58-fd824f9dbf25',
        readAt: null,
      }),
    );
  });
});
