import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsUUID } from 'class-validator';

export class NotificationIdParamDto {
  @ApiProperty({
    description: 'Notification identifier.',
    example: '4d9784cb-c6a1-4a5d-9c58-fd824f9dbf25',
  })
  @Type(() => String)
  @IsUUID()
  id!: string;
}
