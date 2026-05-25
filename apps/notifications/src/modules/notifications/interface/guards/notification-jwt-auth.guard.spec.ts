import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { NotificationJwtAuthGuard } from './notification-jwt-auth.guard';

describe('NotificationJwtAuthGuard', () => {
  const buildContext = (input: Record<string, unknown>) => {
    const request = {
      header: (name: string) =>
        name.toLowerCase() === 'authorization'
          ? input.authorization
          : undefined,
      query: input.query ?? {},
      user: undefined,
    };

    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as any;
  };

  it('accepts bearer tokens and attaches the authenticated user', () => {
    const jwtService = {
      verify: jest.fn().mockReturnValue({
        sub: 'user-1',
        email: 'user@example.com',
      }),
    } as unknown as jest.Mocked<JwtService>;
    const guard = new NotificationJwtAuthGuard(jwtService);
    const context = buildContext({ authorization: 'Bearer token-1' });

    expect(guard.canActivate(context)).toBe(true);
    expect(jwtService.verify).toHaveBeenCalledWith('token-1');
    expect(context.switchToHttp().getRequest().user).toEqual({
      userId: 'user-1',
      email: 'user@example.com',
    });
  });

  it('accepts query tokens for native EventSource clients', () => {
    const jwtService = {
      verify: jest.fn().mockReturnValue({
        sub: 'user-1',
        email: 'user@example.com',
      }),
    } as unknown as jest.Mocked<JwtService>;
    const guard = new NotificationJwtAuthGuard(jwtService);

    expect(
      guard.canActivate(buildContext({ query: { token: 'stream-token' } })),
    ).toBe(true);
    expect(jwtService.verify).toHaveBeenCalledWith('stream-token');
  });

  it('prefers bearer tokens over query tokens when both are present', () => {
    const jwtService = {
      verify: jest.fn().mockReturnValue({
        sub: 'user-1',
        email: 'user@example.com',
      }),
    } as unknown as jest.Mocked<JwtService>;
    const guard = new NotificationJwtAuthGuard(jwtService);

    expect(
      guard.canActivate(
        buildContext({
          authorization: 'Bearer header-token',
          query: { token: 'query-token' },
        }),
      ),
    ).toBe(true);
    expect(jwtService.verify).toHaveBeenCalledWith('header-token');
  });

  it('rejects missing tokens', () => {
    const jwtService = {
      verify: jest.fn(),
    } as unknown as jest.Mocked<JwtService>;
    const guard = new NotificationJwtAuthGuard(jwtService);

    expect(() => guard.canActivate(buildContext({}))).toThrow(
      UnauthorizedException,
    );
    expect(jwtService.verify).not.toHaveBeenCalled();
  });

  it.each([
    ['invalid signature', new Error('invalid signature')],
    ['expired token', new Error('jwt expired')],
  ])('rejects %s', (_caseName, verificationError) => {
    const jwtService = {
      verify: jest.fn(() => {
        throw verificationError;
      }),
    } as unknown as jest.Mocked<JwtService>;
    const guard = new NotificationJwtAuthGuard(jwtService);

    expect(() =>
      guard.canActivate(buildContext({ authorization: 'Bearer bad' })),
    ).toThrow(UnauthorizedException);
  });

  it('rejects tokens without a subject', () => {
    const jwtService = {
      verify: jest.fn().mockReturnValue({
        email: 'user@example.com',
      }),
    } as unknown as jest.Mocked<JwtService>;
    const guard = new NotificationJwtAuthGuard(jwtService);

    expect(() =>
      guard.canActivate(buildContext({ authorization: 'Bearer no-sub' })),
    ).toThrow(UnauthorizedException);
  });
});
