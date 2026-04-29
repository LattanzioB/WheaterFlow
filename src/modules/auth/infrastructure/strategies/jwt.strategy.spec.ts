import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  it('maps the JWT payload to the authenticated user shape', () => {
    const configService = {
      getOrThrow: jest.fn().mockReturnValue('secret-key'),
    } as unknown as jest.Mocked<ConfigService>;
    const strategy = new JwtStrategy(configService);

    expect(
      strategy.validate({ sub: 'user-1', email: 'ana@example.com' }),
    ).toEqual({
      userId: 'user-1',
      email: 'ana@example.com',
    });
    expect(configService.getOrThrow).toHaveBeenCalledWith('jwt.secret');
  });
});
