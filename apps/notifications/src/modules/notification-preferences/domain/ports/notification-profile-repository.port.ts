import { UserNotificationProfile } from '../entities/user-notification-profile.entity';

export interface FindProfilesPageQuery {
  limit: number;
  offset: number;
}

export interface FindProfilesPageResult {
  profiles: UserNotificationProfile[];
  total: number;
}

export interface INotificationProfileRepository {
  findByUserId(userId: string): Promise<UserNotificationProfile | null>;
  findByTelegramLinkCode(code: string): Promise<UserNotificationProfile | null>;
  findSubscribersByStationId(
    stationId: string,
  ): Promise<UserNotificationProfile[]>;
  findPage(query: FindProfilesPageQuery): Promise<FindProfilesPageResult>;
  save(profile: UserNotificationProfile): Promise<void>;
  delete(userId: string): Promise<void>;
}
