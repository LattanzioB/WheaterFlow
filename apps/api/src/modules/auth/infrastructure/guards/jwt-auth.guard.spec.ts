import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  it('exposes the passport auth guard contract for the jwt strategy', () => {
    const guard = new JwtAuthGuard();

    expect(guard).toBeDefined();
    expect(typeof guard.canActivate).toBe('function');
  });
});
