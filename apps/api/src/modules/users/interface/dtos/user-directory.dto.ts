import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { UserRole } from '../../domain/value-objects/user-role.enum';

export class QueryUsersDto {
  @ApiPropertyOptional({
    description: 'Maximum number of users to return.',
    example: 20,
    minimum: 1,
    maximum: 100,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Number of users to skip before the first item.',
    example: 0,
    minimum: 0,
    default: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;
}

export class UserDirectoryItemDto {
  @ApiProperty({ example: 'user-1', description: 'Unique user identifier.' })
  id!: string;

  @ApiProperty({ example: 'Bruno', description: 'User first name.' })
  name!: string;

  @ApiProperty({ example: 'Lattanzio', description: 'User last name.' })
  lastName!: string;

  @ApiProperty({
    example: 'bruno@example.com',
    description: 'User email address.',
  })
  email!: string;

  @ApiProperty({
    enum: UserRole,
    enumName: 'UserRole',
    example: UserRole.USER,
    description: 'Role assigned to the user.',
  })
  role!: UserRole;

  @ApiProperty({
    example: '2026-04-25T12:00:00.000Z',
    description: 'User creation timestamp.',
  })
  createdAt!: string;
}

export class UsersPageDto {
  @ApiProperty({
    type: UserDirectoryItemDto,
    isArray: true,
    description:
      'Users in the requested page, ordered by creation date ascending. The password hash is never included.',
  })
  items!: UserDirectoryItemDto[];

  @ApiProperty({ example: 42, description: 'Total users in the collection.' })
  total!: number;

  @ApiProperty({ example: 20, description: 'Page size used for the query.' })
  limit!: number;

  @ApiProperty({ example: 0, description: 'Offset used for the query.' })
  offset!: number;
}
