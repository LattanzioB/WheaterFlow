import { UserNotificationProfile } from '../entities/user-notification-profile.entity';

export interface INotificationProfileRepository {
  findByUserId(userId: string): Promise<UserNotificationProfile | null>;
  findByTelegramLinkCode(code: string): Promise<UserNotificationProfile | null>;
  findSubscribersByStationId(stationId: string): Promise<UserNotificationProfile[]>;
  save(profile: UserNotificationProfile): Promise<void>;
  delete(userId: string): Promise<void>;
}
