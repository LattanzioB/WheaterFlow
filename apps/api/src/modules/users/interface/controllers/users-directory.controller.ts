import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/infrastructure/guards/jwt-auth.guard';
import { ListUsersService } from '../../application/services/list-users.service';
import {
  QueryUsersDto,
  UserDirectoryItemDto,
  UsersPageDto,
} from '../dtos/user-directory.dto';
import { User } from '../../domain/entities/user.entity';

@ApiTags('Users')
@ApiBearerAuth('bearer')
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersDirectoryController {
  constructor(private readonly listUsersService: ListUsersService) {}

  @Get()
  @ApiOperation({
    summary:
      'List all registered users (read-only directory, password hash excluded).',
  })
  @ApiOkResponse({ type: UsersPageDto })
  async list(@Query() dto: QueryUsersDto): Promise<UsersPageDto> {
    const result = await this.listUsersService.execute({
      limit: dto.limit,
      offset: dto.offset,
    });

    return {
      items: result.users.map((user) => this.toItem(user)),
      total: result.total,
      limit: result.limit,
      offset: result.offset,
    };
  }

  private toItem(user: User): UserDirectoryItemDto {
    return {
      id: user.getId(),
      name: user.getName(),
      lastName: user.getLastName(),
      email: user.getEmail().getValue(),
      role: user.getRole(),
      createdAt: user.getCreatedAt().toISOString(),
    };
  }
}
