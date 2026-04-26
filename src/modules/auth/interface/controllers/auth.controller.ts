import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { LoginUserService } from '../../application/services/login-user.service';
import { RegisterUserService } from '../../application/services/register-user.service';
import { LoginDto } from '../dtos/login.dto';
import { RegisterDto } from '../dtos/register.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly registerUserService: RegisterUserService,
    private readonly loginUserService: LoginUserService,
  ) {}

  @Post('register')
  async register(@Body() dto: RegisterDto): Promise<{ access_token: string }> {
    try {
      const result = await this.registerUserService.execute({
        name: dto.name,
        lastName: dto.lastName,
        email: dto.email,
        password: dto.password,
        telegramChatId:
          dto.deliveryChannels?.telegram?.chatId ?? dto.telegramChatId,
      });

      return {
        access_token: result.accessToken,
      };
    } catch (error) {
      if (error instanceof Error && error.message === 'Email is already registered') {
        throw new ConflictException(error.message);
      }

      throw new BadRequestException(
        error instanceof Error ? error.message : 'Unable to register user',
      );
    }
  }

  @Post('login')
  async login(@Body() dto: LoginDto): Promise<{ access_token: string }> {
    try {
      const result = await this.loginUserService.execute({
        email: dto.email,
        password: dto.password,
      });

      return {
        access_token: result.accessToken,
      };
    } catch (error) {
      if (error instanceof Error && error.message === 'Invalid credentials') {
        throw new UnauthorizedException(error.message);
      }

      throw new BadRequestException(
        error instanceof Error ? error.message : 'Unable to log in',
      );
    }
  }
}
