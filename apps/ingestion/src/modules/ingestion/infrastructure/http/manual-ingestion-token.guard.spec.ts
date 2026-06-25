import { UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ManualIngestionTokenGuard } from './manual-ingestion-token.guard';

function contextWithToken(token?: string): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        header: () => token,
      }),
    }),
  } as unknown as ExecutionContext;
}

describe('ManualIngestionTokenGuard', () => {
  const guard = new ManualIngestionTokenGuard(
    new ConfigService({
      api: { systemToken: 'test-ingestion-system-token' },
    }),
  );

  it('protects the manual trigger with the shared system token', () => {
    expect(
      guard.canActivate(contextWithToken('test-ingestion-system-token')),
    ).toBe(true);
    expect(() => guard.canActivate(contextWithToken('wrong'))).toThrow(
      UnauthorizedException,
    );
  });
});
