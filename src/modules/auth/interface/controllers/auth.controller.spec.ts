import {
  BadRequestException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { LoginUserService } from '../../application/services/login-user.service';
import { RegisterUserService } from '../../application/services/register-user.service';
import { AuthController } from './auth.controller';

describe('AuthController', () => {
  const buildRegisterService = () =>
    ({
      execute: jest.fn(),
    }) as unknown as jest.Mocked<RegisterUserService>;

  const buildLoginService = () =>
    ({
      execute: jest.fn(),
    }) as unknown as jest.Mocked<LoginUserService>;

  it('registers users and returns an access token response', async () => {
    const registerService = buildRegisterService();
    const loginService = buildLoginService();
    const controller = new AuthController(registerService, loginService);

    registerService.execute.mockResolvedValue({ accessToken: 'jwt-token' });

    await expect(
      controller.register({
        name: 'Bruno',
        lastName: 'Lattanzio',
        email: 'bruno@example.com',
        password: 'secure123',
        deliveryChannels: {
          telegram: {
            chatId: '12345',
          },
        },
      }),
    ).resolves.toEqual({
      access_token: 'jwt-token',
    });
    expect(registerService.execute).toHaveBeenCalledWith({
      name: 'Bruno',
      lastName: 'Lattanzio',
      email: 'bruno@example.com',
      password: 'secure123',
      telegramChatId: '12345',
    });
  });

  it('maps duplicate email errors to conflict responses', async () => {
    const registerService = buildRegisterService();
    const loginService = buildLoginService();
    const controller = new AuthController(registerService, loginService);

    registerService.execute.mockRejectedValue(
      new Error('Email is already registered'),
    );

    await expect(
      controller.register({
        name: 'Bruno',
        lastName: 'Lattanzio',
        email: 'bruno@example.com',
        password: 'secure123',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('logs users in and returns an access token response', async () => {
    const registerService = buildRegisterService();
    const loginService = buildLoginService();
    const controller = new AuthController(registerService, loginService);

    loginService.execute.mockResolvedValue({ accessToken: 'jwt-token' });

    await expect(
      controller.login({
        email: 'bruno@example.com',
        password: 'secure123',
      }),
    ).resolves.toEqual({
      access_token: 'jwt-token',
    });
  });

  it('maps invalid credential errors to unauthorized responses', async () => {
    const registerService = buildRegisterService();
    const loginService = buildLoginService();
    const controller = new AuthController(registerService, loginService);

    loginService.execute.mockRejectedValue(new Error('Invalid credentials'));

    await expect(
      controller.login({
        email: 'bruno@example.com',
        password: 'wrong-password',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('maps unexpected login failures to bad requests', async () => {
    const registerService = buildRegisterService();
    const loginService = buildLoginService();
    const controller = new AuthController(registerService, loginService);

    loginService.execute.mockRejectedValue(new Error('Password cannot be empty'));

    await expect(
      controller.login({
        email: 'bruno@example.com',
        password: '',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
