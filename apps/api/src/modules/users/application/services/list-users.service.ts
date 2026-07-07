import { Inject, Injectable } from '@nestjs/common';
import type { IUserRepository } from '../../domain/ports/user-repository.port';
import { User } from '../../domain/entities/user.entity';
import { USER_REPOSITORY_TOKEN } from '@shared/tokens/injection-tokens';

export interface ListUsersQuery {
  limit?: number;
  offset?: number;
}

export interface ListUsersResult {
  users: User[];
  total: number;
  limit: number;
  offset: number;
}

const DEFAULT_LIMIT = 20;

@Injectable()
export class ListUsersService {
  constructor(
    @Inject(USER_REPOSITORY_TOKEN)
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(query: ListUsersQuery = {}): Promise<ListUsersResult> {
    const limit = query.limit ?? DEFAULT_LIMIT;
    const offset = query.offset ?? 0;
    const users = await this.userRepository.findAll();
    const sorted = [...users].sort(
      (a, b) => a.getCreatedAt().getTime() - b.getCreatedAt().getTime(),
    );

    return {
      users: sorted.slice(offset, offset + limit),
      total: users.length,
      limit,
      offset,
    };
  }
}
