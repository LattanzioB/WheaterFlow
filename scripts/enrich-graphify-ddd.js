const fs = require('fs');
const path = require('path');

const MODULE_NAMES = {
  users: 'User',
  stations: 'WeatherStation',
  measurements: 'Measurement',
  auth: 'Auth',
  notifications: 'Notifications',
};

const ROLE_PATTERNS = [
  { marker: '/domain/entities/', role: 'entity' },
  { marker: '/domain/value-objects/', role: 'value-object' },
  { marker: '/domain/events/', role: 'domain-event' },
  { marker: '/domain/ports/', role: 'port' },
  { marker: '/domain/services/', role: 'domain-service' },
  { marker: '/application/services/', role: 'application-service' },
  { marker: '/application/ports/', role: 'port-alias' },
  { marker: '/interface/controllers/', role: 'controller' },
  { marker: '/interface/dtos/', role: 'dto' },
  { marker: '/infrastructure/repositories/', role: 'repository' },
  { marker: '/infrastructure/mappers/', role: 'mapper' },
  { marker: '/infrastructure/persistence/', role: 'schema' },
  { marker: '/infrastructure/adapters/', role: 'adapter' },
  { marker: '/infrastructure/guards/', role: 'guard' },
  { marker: '/infrastructure/strategies/', role: 'strategy' },
];

function normalizePath(value) {
  return String(value || '').replace(/\\/g, '/');
}

function getLayerFromPath(normalizedPath) {
  if (normalizedPath.includes('/domain/')) {
    return 'domain';
  }
  if (normalizedPath.includes('/application/')) {
    return 'application';
  }
  if (normalizedPath.includes('/interface/')) {
    return 'interface';
  }
  if (normalizedPath.includes('/infrastructure/')) {
    return 'infrastructure';
  }
  if (normalizedPath.startsWith('src/shared/domain/')) {
    return 'domain-shared';
  }
  if (normalizedPath.startsWith('src/shared/')) {
    return 'shared';
  }
  if (normalizedPath.startsWith('src/')) {
    return 'app-shell';
  }
  if (normalizedPath.startsWith('scripts/')) {
    return 'tooling';
  }
  if (normalizedPath.startsWith('docs/')) {
    return 'docs';
  }
  return 'workspace';
}

function getModuleFromPath(normalizedPath) {
  const match = normalizedPath.match(/^src\/modules\/([^/]+)\//);
  if (match) {
    return MODULE_NAMES[match[1]] || match[1];
  }
  if (normalizedPath.startsWith('src/shared/')) {
    return 'Shared';
  }
  if (normalizedPath.startsWith('scripts/')) {
    return 'Tooling';
  }
  if (normalizedPath.startsWith('docs/')) {
    return 'Docs';
  }
  return 'Workspace';
}

function getRoleFromPath(normalizedPath, label) {
  for (const pattern of ROLE_PATTERNS) {
    if (normalizedPath.includes(pattern.marker)) {
      return pattern.role;
    }
  }
  if (normalizedPath.endsWith('.module.ts')) {
    return 'module';
  }
  if (normalizedPath.endsWith('.spec.ts')) {
    return 'test';
  }
  if (String(label || '').endsWith('()')) {
    return 'function';
  }
  return 'artifact';
}

function classifyNode(node) {
  const normalizedPath = normalizePath(node.source_file || node.label);
  const moduleName = getModuleFromPath(normalizedPath);

  return {
    boundedContext: 'WeatherFlow',
    module: moduleName,
    moduleType:
      moduleName === 'User' ||
      moduleName === 'WeatherStation' ||
      moduleName === 'Measurement'
        ? 'aggregate'
        : moduleName === 'Auth' || moduleName === 'Notifications'
          ? 'supporting-module'
          : 'auxiliary',
    layer: getLayerFromPath(normalizedPath),
    role: getRoleFromPath(normalizedPath, node.label),
    sourceFile: normalizedPath,
  };
}

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(fullPath));
      continue;
    }
    files.push(fullPath);
  }
  return files;
}

function extractImports(content) {
  const matches = content.matchAll(/from\s+['"]([^'"]+)['"]/g);
  return Array.from(matches, (match) => match[1]);
}

function resolveImport(sourceFile, importPath, repoRoot) {
  if (!importPath.startsWith('.')) {
    return importPath;
  }

  const resolved = path.resolve(path.dirname(sourceFile), importPath);
  return normalizePath(path.relative(repoRoot, `${resolved}.ts`));
}

function isAllowedInterfaceInfrastructureImport(resolvedImport) {
  return (
    resolvedImport.includes('/auth/infrastructure/guards/') ||
    resolvedImport.includes('/auth/infrastructure/strategies/')
  );
}

function isDomainSafeExternalImport(importPath) {
  return importPath.startsWith('node:');
}

function isApplicationSafeExternalImport(importPath) {
  return (
    importPath.startsWith('node:') ||
    importPath === '@nestjs/common' ||
    importPath === '@nestjs/event-emitter'
  );
}

function collectArchitectureViolations(repoRoot) {
  const moduleRoot = path.join(repoRoot, 'src', 'modules');
  const sharedDomainRoot = path.join(repoRoot, 'src', 'shared', 'domain');
  const files = [
    ...walk(moduleRoot),
    ...(fs.existsSync(sharedDomainRoot) ? walk(sharedDomainRoot) : []),
  ].filter((file) => file.endsWith('.ts') && !file.endsWith('.spec.ts'));

  const violations = [];

  for (const file of files) {
    const normalizedFile = normalizePath(path.relative(repoRoot, file));
    const layer = getLayerFromPath(normalizedFile);
    const imports = extractImports(fs.readFileSync(file, 'utf8'));

    for (const importPath of imports) {
      const resolvedImport = resolveImport(file, importPath, repoRoot);
      const importedLayer = getLayerFromPath(resolvedImport);

      if (layer === 'domain') {
        if (!importPath.startsWith('.') && !isDomainSafeExternalImport(importPath)) {
          violations.push(
            `${normalizedFile}: domain must not import external dependency "${importPath}"`,
          );
        }

        if (
          importedLayer === 'application' ||
          importedLayer === 'interface' ||
          importedLayer === 'infrastructure' ||
          (importedLayer === 'shared' &&
            !resolvedImport.startsWith('src/shared/domain/'))
        ) {
          violations.push(
            `${normalizedFile}: domain must not import ${resolvedImport}`,
          );
        }
      }

      if (layer === 'application') {
        if (
          !importPath.startsWith('.') &&
          importPath.startsWith('@nestjs') &&
          !isApplicationSafeExternalImport(importPath)
        ) {
          violations.push(
            `${normalizedFile}: application imports unsupported framework dependency "${importPath}"`,
          );
        }

        if (importedLayer === 'interface' || importedLayer === 'infrastructure') {
          violations.push(
            `${normalizedFile}: application must not import ${resolvedImport}`,
          );
        }
      }

      if (
        layer === 'interface' &&
        importedLayer === 'infrastructure' &&
        !isAllowedInterfaceInfrastructureImport(resolvedImport)
      ) {
        violations.push(
          `${normalizedFile}: interface must not import ${resolvedImport}`,
        );
      }
    }
  }

  return violations.sort();
}

function buildSummary(nodes) {
  const summary = {
    aggregates: {},
    layers: {},
    roles: {},
  };

  for (const node of nodes) {
    summary.aggregates[node.ddd.module] =
      (summary.aggregates[node.ddd.module] || 0) + 1;
    summary.layers[node.ddd.layer] = (summary.layers[node.ddd.layer] || 0) + 1;
    summary.roles[node.ddd.role] = (summary.roles[node.ddd.role] || 0) + 1;
  }

  return summary;
}

function createEnrichedGraph(graphData, repoRoot) {
  const nodes = (graphData.nodes || []).map((node) => ({
    ...node,
    ddd: classifyNode(node),
  }));

  return {
    ...graphData,
    ddd: {
      boundedContext: 'WeatherFlow',
      generatedAt: new Date().toISOString(),
      summary: buildSummary(nodes),
      architectureViolations: collectArchitectureViolations(repoRoot),
    },
    nodes,
  };
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function renderMarkdownReport(enrichedGraph) {
  const lines = [
    '# DDD Graph Report',
    '',
    '## Bounded Context',
    '- `WeatherFlow`',
    '',
    '## Aggregate and Module Counts',
  ];

  for (const [name, count] of Object.entries(enrichedGraph.ddd.summary.aggregates)) {
    lines.push(`- \`${name}\`: ${count}`);
  }

  lines.push('', '## Layer Counts');
  for (const [name, count] of Object.entries(enrichedGraph.ddd.summary.layers)) {
    lines.push(`- \`${name}\`: ${count}`);
  }

  lines.push('', '## Role Counts');
  for (const [name, count] of Object.entries(enrichedGraph.ddd.summary.roles)) {
    lines.push(`- \`${name}\`: ${count}`);
  }

  lines.push('', '## Architecture Violations');
  if (enrichedGraph.ddd.architectureViolations.length === 0) {
    lines.push('- None detected');
  } else {
    for (const violation of enrichedGraph.ddd.architectureViolations) {
      lines.push(`- ${violation}`);
    }
  }

  return `${lines.join('\n')}\n`;
}

function renderHtmlReport(enrichedGraph) {
  const nodeRows = enrichedGraph.nodes
    .filter((node) => node.ddd.layer !== 'docs')
    .slice(0, 200)
    .map(
      (node) => `
        <tr>
          <td>${escapeHtml(node.label)}</td>
          <td>${escapeHtml(node.ddd.module)}</td>
          <td>${escapeHtml(node.ddd.layer)}</td>
          <td>${escapeHtml(node.ddd.role)}</td>
          <td>${escapeHtml(node.ddd.sourceFile)}</td>
        </tr>`,
    )
    .join('');

  const violations = enrichedGraph.ddd.architectureViolations.length
    ? enrichedGraph.ddd.architectureViolations
        .map((violation) => `<li>${escapeHtml(violation)}</li>`)
        .join('')
    : '<li>None detected</li>';

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>WeatherFlow DDD Graph</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 24px; color: #1a1a1a; }
      h1, h2 { margin-bottom: 12px; }
      table { border-collapse: collapse; width: 100%; margin-top: 16px; }
      th, td { border: 1px solid #d0d7de; padding: 8px; text-align: left; }
      th { background: #f6f8fa; }
      .grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
      .card { border: 1px solid #d0d7de; border-radius: 8px; padding: 12px; background: #fff; }
      code { background: #f6f8fa; padding: 2px 4px; }
    </style>
  </head>
  <body>
    <h1>WeatherFlow DDD Graph</h1>
    <p>Bounded context: <code>WeatherFlow</code></p>
    <div class="grid">
      <div class="card"><h2>Aggregates</h2><pre>${escapeHtml(
        JSON.stringify(enrichedGraph.ddd.summary.aggregates, null, 2),
      )}</pre></div>
      <div class="card"><h2>Layers</h2><pre>${escapeHtml(
        JSON.stringify(enrichedGraph.ddd.summary.layers, null, 2),
      )}</pre></div>
      <div class="card"><h2>Roles</h2><pre>${escapeHtml(
        JSON.stringify(enrichedGraph.ddd.summary.roles, null, 2),
      )}</pre></div>
    </div>
    <h2>Architecture Violations</h2>
    <ul>${violations}</ul>
    <h2>Classified Nodes</h2>
    <table>
      <thead>
        <tr><th>Label</th><th>Module</th><th>Layer</th><th>Role</th><th>Source</th></tr>
      </thead>
      <tbody>${nodeRows}</tbody>
    </table>
  </body>
</html>`;
}

function writeArtifacts(repoRoot, enrichedGraph) {
  const outputDir = path.join(repoRoot, 'graphify-out');
  fs.mkdirSync(outputDir, { recursive: true });

  fs.writeFileSync(
    path.join(outputDir, 'ddd-graph.json'),
    JSON.stringify(enrichedGraph, null, 2),
  );
  fs.writeFileSync(
    path.join(outputDir, 'DDD_GRAPH_REPORT.md'),
    renderMarkdownReport(enrichedGraph),
  );
  fs.writeFileSync(
    path.join(outputDir, 'ddd-graph.html'),
    renderHtmlReport(enrichedGraph),
  );
}

function main() {
  const repoRoot = process.cwd();
  const graphPath = path.join(repoRoot, 'graphify-out', 'graph.json');

  if (!fs.existsSync(graphPath)) {
    throw new Error(
      'graphify-out/graph.json was not found. Run "graphify update ." first.',
    );
  }

  const graphData = JSON.parse(fs.readFileSync(graphPath, 'utf8'));
  const enrichedGraph = createEnrichedGraph(graphData, repoRoot);
  writeArtifacts(repoRoot, enrichedGraph);
}

module.exports = {
  classifyNode,
  collectArchitectureViolations,
  createEnrichedGraph,
  getLayerFromPath,
  getModuleFromPath,
  getRoleFromPath,
  normalizePath,
  renderMarkdownReport,
};

if (require.main === module) {
  main();
}
