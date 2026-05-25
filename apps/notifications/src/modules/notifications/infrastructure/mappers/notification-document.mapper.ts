import { Notification } from '../../domain/entities/notification.entity';
import {
  NotificationModelDocument,
  NotificationPersistence,
} from '../persistence/notification.schema';

export class NotificationDocumentMapper {
  static toPersistence(notification: Notification): NotificationPersistence {
    return {
      _id: notification.getId(),
      userId: notification.getUserId(),
      stationId: notification.getStationId(),
      stationName: notification.getStationName(),
      alertType: notification.getAlertType(),
      temperature: notification.getTemperature(),
      humidity: notification.getHumidity(),
      pressure: notification.getPressure(),
      reportedAt: notification.getReportedAt(),
      createdAt: notification.getCreatedAt(),
      readAt: notification.getReadAt(),
      messageId: notification.getMessageId(),
    };
  }

  static toDomain(
    document: NotificationPersistence | NotificationModelDocument,
  ): Notification {
    return Notification.create({
      id: document._id,
      userId: document.userId,
      stationId: document.stationId,
      stationName: document.stationName,
      alertType: document.alertType,
      temperature: document.temperature,
      humidity: document.humidity,
      pressure: document.pressure,
      reportedAt: document.reportedAt,
      createdAt: document.createdAt,
      readAt: document.readAt,
      messageId: document.messageId,
    });
  }
}
