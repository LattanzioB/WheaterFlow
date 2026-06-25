import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';

export const INGESTION_TOKEN_HEADER = 'x-ingestion-token';

@Injectable()
export class IngestionSystemTokenGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const providedToken = request.header(INGESTION_TOKEN_HEADER);
    const expectedToken = this.configService.getOrThrow<string>(
      'ingestion.systemToken',
    );

    if (!providedToken || !this.matches(providedToken, expectedToken)) {
      throw new UnauthorizedException('Invalid ingestion system token');
    }

    return true;
  }

  private matches(providedToken: string, expectedToken: string): boolean {
    const provided = Buffer.from(providedToken);
    const expected = Buffer.from(expectedToken);

    return (
      provided.length === expected.length && timingSafeEqual(provided, expected)
    );
  }
}
