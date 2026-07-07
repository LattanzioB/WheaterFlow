import { Notification } from '../entities/notification.entity';

export interface FindNotificationsByUserIdQuery {
  userId: string;
  limit: number;
  cursor?: string;
  unreadOnly?: boolean;
}

export interface FindNotificationsByUserIdResult {
  notifications: Notification[];
  nextCursor: string | null;
}

export interface FindAllNotificationsPageQuery {
  limit: number;
  offset: number;
}

export interface FindAllNotificationsPageResult {
  notifications: Notification[];
  total: number;
}

export interface INotificationRepository {
  save(notification: Notification): Promise<void>;
  findById(id: string): Promise<Notification | null>;
  findByUserId(
    query: FindNotificationsByUserIdQuery,
  ): Promise<FindNotificationsByUserIdResult>;
  findAllPage(
    query: FindAllNotificationsPageQuery,
  ): Promise<FindAllNotificationsPageResult>;
  countUnread(userId: string): Promise<number>;
  markRead(id: string, userId: string): Promise<Notification | null>;
  markAllRead(userId: string): Promise<number>;
}
