import path from 'node:path';
import { collectArchitectureViolations } from '../../../scripts/enrich-graphify-ddd.js';

describe('architecture boundaries', () => {
  it('keeps module dependencies aligned with the documented DDD layers', () => {
    const repoRoot = path.resolve(__dirname, '../../..');
    const violations = collectArchitectureViolations(repoRoot);

    expect(violations).toEqual([]);
  });
});
