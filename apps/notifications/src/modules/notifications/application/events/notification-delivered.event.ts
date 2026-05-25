import { Notification } from '../../domain/entities/notification.entity';

export const NOTIFICATION_DELIVERED_EVENT = 'notification.delivered';

export interface NotificationDeliveredEvent {
  userId: string;
  notification: Notification;
}
