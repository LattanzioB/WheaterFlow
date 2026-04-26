import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    description: 'Email address used to authenticate an existing user.',
    example: 'bruno@example.com',
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    description: 'Plain-text password for the user account.',
    example: 'secure123',
  })
  @IsString()
  @IsNotEmpty()
  password!: string;
}
