import { Inject, Injectable } from '@nestjs/common';
import { NOTIFICATION_PROFILE_REPOSITORY_TOKEN } from '@shared/tokens/injection-tokens';
import { UserNotificationProfile } from '../../domain/entities/user-notification-profile.entity';
import type { INotificationProfileRepository } from '../../domain/ports/notification-profile-repository.port';

export interface ListAllNotificationProfilesQuery {
  limit?: number;
  offset?: number;
}

export interface ListAllNotificationProfilesResult {
  profiles: UserNotificationProfile[];
  total: number;
  limit: number;
  offset: number;
}

const DEFAULT_LIMIT = 20;

@Injectable()
export class ListAllNotificationProfilesService {
  constructor(
    @Inject(NOTIFICATION_PROFILE_REPOSITORY_TOKEN)
    private readonly profileRepository: INotificationProfileRepository,
  ) {}

  async execute(
    query: ListAllNotificationProfilesQuery = {},
  ): Promise<ListAllNotificationProfilesResult> {
    const limit = query.limit ?? DEFAULT_LIMIT;
    const offset = query.offset ?? 0;
    const page = await this.profileRepository.findPage({ limit, offset });

    return {
      profiles: page.profiles,
      total: page.total,
      limit,
      offset,
    };
  }
}
