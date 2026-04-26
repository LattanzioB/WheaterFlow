import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({
    example: 'Bruno',
    description: 'User first name',
  })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({
    example: 'Lattanzio',
    description: 'User last name',
  })
  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @ApiProperty({
    example: 'bruno@example.com',
    description: 'User email address',
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    example: 'secure123',
    minLength: 8,
    description: 'User password',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password!: string;
}
