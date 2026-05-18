import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { StringValue } from 'ms';
import { AuthTokenPayload } from '../../domain/ports/auth-token-payload';
import { TokenService } from '../../domain/ports/token-service.port';

@Injectable()
export class JwtTokenService implements TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async generateToken(payload: AuthTokenPayload): Promise<string> {
    return this.jwtService.signAsync(payload, {
      secret: this.configService.getOrThrow<string>('jwt.secret'),
      expiresIn: this.configService.getOrThrow<string>(
        'jwt.expiresIn',
      ) as StringValue,
    });
  }
}
