import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { AlertType } from '@contracts/measurements/alert-type';

export class ListNotificationsQueryDto {
  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === true || value === 'true')
  unreadOnly?: boolean;

  @ApiPropertyOptional({ example: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ example: 'eyJjcmVhdGVkQXQiOiIyMDI2LTA1LTAx...' })
  @IsOptional()
  @IsString()
  cursor?: string;
}

export class NotificationResponseDto {
  @ApiProperty({ example: 'notification-1' })
  id!: string;

  @ApiProperty({ example: 'user-1' })
  userId!: string;

  @ApiProperty({ example: 'station-1' })
  stationId!: string;

  @ApiProperty({ example: 'Central' })
  stationName!: string;

  @ApiProperty({ enum: AlertType })
  alertType!: AlertType;

  @ApiProperty({ example: 25.2 })
  temperature!: number;

  @ApiProperty({ example: 91 })
  humidity!: number;

  @ApiProperty({ example: 970 })
  pressure!: number;

  @ApiProperty({ example: '2026-05-01T10:00:00.000Z' })
  reportedAt!: string;

  @ApiProperty({ example: '2026-05-01T10:01:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: null, nullable: true })
  readAt!: string | null;

  @ApiProperty({ example: 'alert-message-1' })
  messageId!: string;
}

export class ListNotificationsResponseDto {
  @ApiProperty({ type: NotificationResponseDto, isArray: true })
  notifications!: NotificationResponseDto[];

  @ApiProperty({ example: null, nullable: true })
  nextCursor!: string | null;
}

export class MarkAllNotificationsReadResponseDto {
  @ApiProperty({ example: 3 })
  modifiedCount!: number;
}
