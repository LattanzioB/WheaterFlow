import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const sourceRoot = join(__dirname, '..', '..', '..', '..');

function collectTypeScriptFiles(directory: string): string[] {
  return readdirSync(directory)
    .flatMap((entry) => {
      const path = join(directory, entry);
      return statSync(path).isDirectory()
        ? collectTypeScriptFiles(path)
        : path.endsWith('.ts')
          ? [path]
          : [];
    })
    .filter((path) => !path.endsWith('.spec.ts'));
}

describe('ingestion architecture boundaries', () => {
  const sourceFiles = collectTypeScriptFiles(sourceRoot);

  it('does not import implementation or domain code from other applications', () => {
    const violations = sourceFiles.flatMap((path) => {
      const source = readFileSync(path, 'utf8');
      return /from\s+['"](?:@api\/|@notifications\/|.*apps\/(?:api|notifications)\/)/.test(
        source,
      )
        ? [relative(sourceRoot, path)]
        : [];
    });

    expect(violations).toEqual([]);
  });

  it('keeps the domain layer framework-free', () => {
    const domainFiles = sourceFiles.filter((path) =>
      path.includes(`${join('modules', 'ingestion', 'domain')}`),
    );
    const violations = domainFiles.flatMap((path) => {
      const source = readFileSync(path, 'utf8');
      return /from\s+['"]@nestjs\//.test(source)
        ? [relative(sourceRoot, path)]
        : [];
    });

    expect(violations).toEqual([]);
  });
});
