import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { JwtTokenService } from './jwt-token.service';

describe('JwtTokenService', () => {
  it('signs tokens with the configured secret and expiration', async () => {
    const jwtService = {
      signAsync: jest.fn().mockResolvedValue('signed-token'),
    } as unknown as jest.Mocked<JwtService>;
    const configService = {
      getOrThrow: jest.fn((key: string) => {
        if (key === 'jwt.secret') {
          return 'secret-key';
        }

        return '7d';
      }),
    } as unknown as jest.Mocked<ConfigService>;
    const service = new JwtTokenService(jwtService, configService);

    const result = await service.generateToken({
      sub: 'user-1',
      email: 'bruno@example.com',
    });

    expect(jwtService.signAsync).toHaveBeenCalledWith(
      {
        sub: 'user-1',
        email: 'bruno@example.com',
      },
      {
        secret: 'secret-key',
        expiresIn: '7d',
      },
    );
    expect(result).toBe('signed-token');
  });
});
