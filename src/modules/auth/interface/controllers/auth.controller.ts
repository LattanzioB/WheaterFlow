import {
  HttpCode,
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { LoginUserService } from '../../application/services/login-user.service';
import { RegisterUserService } from '../../application/services/register-user.service';
import { AuthTokenResponseDto } from '../dtos/auth-token-response.dto';
import { LoginDto } from '../dtos/login.dto';
import { RegisterDto } from '../dtos/register.dto';

@Controller('auth')
@ApiTags('Auth')
export class AuthController {
  constructor(
    private readonly registerUserService: RegisterUserService,
    private readonly loginUserService: LoginUserService,
  ) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user account' })
  @ApiCreatedResponse({
    description: 'User registered successfully and an access token was issued.',
    type: AuthTokenResponseDto,
  })
  @ApiBadRequestResponse({ description: 'The provided registration payload is invalid.' })
  @ApiConflictResponse({ description: 'The email address is already registered.' })
  async register(@Body() dto: RegisterDto): Promise<AuthTokenResponseDto> {
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
  @HttpCode(200)
  @ApiOperation({ summary: 'Authenticate an existing user' })
  @ApiOkResponse({
    description: 'Credentials are valid and an access token was issued.',
    type: AuthTokenResponseDto,
  })
  @ApiBadRequestResponse({ description: 'The provided login payload is invalid.' })
  @ApiUnauthorizedResponse({ description: 'The provided credentials are invalid.' })
  async login(@Body() dto: LoginDto): Promise<AuthTokenResponseDto> {
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
