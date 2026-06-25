import { UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IngestionSystemTokenGuard } from './ingestion-system-token.guard';

function contextWithToken(token?: string): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        header: (name: string) =>
          name === 'x-ingestion-token' ? token : undefined,
      }),
    }),
  } as unknown as ExecutionContext;
}

describe('IngestionSystemTokenGuard', () => {
  const guard = new IngestionSystemTokenGuard(
    new ConfigService({
      ingestion: { systemToken: 'test-ingestion-system-token' },
    }),
  );

  it('accepts the configured system token', () => {
    expect(
      guard.canActivate(contextWithToken('test-ingestion-system-token')),
    ).toBe(true);
  });

  it('rejects missing or invalid tokens', () => {
    expect(() => guard.canActivate(contextWithToken())).toThrow(
      UnauthorizedException,
    );
    expect(() => guard.canActivate(contextWithToken('invalid-token'))).toThrow(
      UnauthorizedException,
    );
  });
});
