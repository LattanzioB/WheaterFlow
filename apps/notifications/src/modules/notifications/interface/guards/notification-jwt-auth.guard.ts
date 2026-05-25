import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

interface JwtPayload {
  sub: string;
  email: string;
}

export interface AuthenticatedNotificationUser {
  userId: string;
  email: string;
}

export type AuthenticatedNotificationRequest = Request & {
  user?: AuthenticatedNotificationUser;
};

@Injectable()
export class NotificationJwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<AuthenticatedNotificationRequest>();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Missing authentication token');
    }

    try {
      const payload = this.jwtService.verify<JwtPayload>(token);
      if (typeof payload.sub !== 'string' || !payload.sub.trim()) {
        throw new UnauthorizedException('Invalid authentication token');
      }

      request.user = {
        userId: payload.sub,
        email: typeof payload.email === 'string' ? payload.email : '',
      };
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException('Invalid authentication token');
    }
  }

  private extractToken(request: Request): string | null {
    const authorization = request.header('authorization');

    if (authorization?.startsWith('Bearer ')) {
      return authorization.slice('Bearer '.length).trim();
    }

    const queryToken = request.query.token;
    return typeof queryToken === 'string' && queryToken.trim()
      ? queryToken.trim()
      : null;
  }
}
