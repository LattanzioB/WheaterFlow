import { Notification } from '../../domain/entities/notification.entity';
import { NotificationResponseDto } from '../dtos/notification.dto';

export class NotificationResponseMapper {
  static toResponse(notification: Notification): NotificationResponseDto {
    return {
      id: notification.getId(),
      userId: notification.getUserId(),
      stationId: notification.getStationId(),
      stationName: notification.getStationName(),
      alertType: notification.getAlertType(),
      temperature: notification.getTemperature(),
      humidity: notification.getHumidity(),
      pressure: notification.getPressure(),
      reportedAt: notification.getReportedAt().toISOString(),
      createdAt: notification.getCreatedAt().toISOString(),
      readAt: notification.getReadAt()?.toISOString() ?? null,
      messageId: notification.getMessageId(),
    };
  }
}
