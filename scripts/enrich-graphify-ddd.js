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

function serializeForScript(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

function toTitleCase(value) {
  return String(value || '')
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function getModulePalette(modules) {
  const preferredColors = {
    User: '#4E79A7',
    WeatherStation: '#59A14F',
    Measurement: '#F28E2B',
    Auth: '#E15759',
    Notifications: '#B07AA1',
    Shared: '#76B7B2',
    Tooling: '#9C755F',
    Workspace: '#BAB0AC',
    Docs: '#EDC948',
  };
  const fallbackColors = [
    '#4E79A7',
    '#F28E2B',
    '#E15759',
    '#76B7B2',
    '#59A14F',
    '#EDC948',
    '#B07AA1',
    '#FF9DA7',
    '#9C755F',
    '#BAB0AC',
  ];

  const palette = {};
  let fallbackIndex = 0;

  for (const moduleName of modules) {
    if (preferredColors[moduleName]) {
      palette[moduleName] = preferredColors[moduleName];
      continue;
    }

    palette[moduleName] = fallbackColors[fallbackIndex % fallbackColors.length];
    fallbackIndex += 1;
  }

  return palette;
}

function buildVisualizationData(enrichedGraph) {
  const rawLinks = Array.isArray(enrichedGraph.links)
    ? enrichedGraph.links
    : Array.isArray(enrichedGraph.edges)
      ? enrichedGraph.edges
      : [];

  const degreeById = {};
  for (const link of rawLinks) {
    const sourceId = link.source || link.from || link._src;
    const targetId = link.target || link.to || link._tgt;
    if (!sourceId || !targetId) {
      continue;
    }
    degreeById[sourceId] = (degreeById[sourceId] || 0) + 1;
    degreeById[targetId] = (degreeById[targetId] || 0) + 1;
  }

  const modules = Array.from(
    new Set(enrichedGraph.nodes.map((node) => node.ddd.module)),
  ).sort((left, right) => left.localeCompare(right));
  const layers = Array.from(
    new Set(enrichedGraph.nodes.map((node) => node.ddd.layer)),
  ).sort((left, right) => left.localeCompare(right));

  const moduleColors = getModulePalette(modules);
  const layerColors = {
    domain: '#4E79A7',
    application: '#F28E2B',
    interface: '#E15759',
    infrastructure: '#59A14F',
    shared: '#76B7B2',
    'domain-shared': '#B07AA1',
    'app-shell': '#9C755F',
    tooling: '#EDC948',
    workspace: '#BAB0AC',
    docs: '#FF9DA7',
  };
  const layerShapes = {
    domain: 'diamond',
    application: 'dot',
    interface: 'box',
    infrastructure: 'triangle',
    shared: 'star',
    'domain-shared': 'star',
    'app-shell': 'hexagon',
    tooling: 'database',
    workspace: 'square',
    docs: 'text',
  };
  const moduleTypeBorderWidth = {
    aggregate: 3.5,
    'supporting-module': 2.5,
    auxiliary: 1.5,
  };

  const nodes = enrichedGraph.nodes.map((node) => {
    const layer = node.ddd.layer;
    const moduleName = node.ddd.module;
    const color = moduleColors[moduleName] || '#888888';
    const layerColor = layerColors[layer] || '#888888';
    const degree = degreeById[node.id] || 0;

    return {
      id: node.id,
      label: node.label,
      title: node.label,
      shape: layerShapes[layer] || 'dot',
      size: Math.max(10, 10 + degree * 1.1),
      font: {
        size: degree >= 8 ? 13 : degree >= 4 ? 11 : 0,
        color: '#F5F7FA',
        face: 'Segoe UI',
      },
      color: {
        background: color,
        border: layerColor,
        highlight: {
          background: '#FFFFFF',
          border: layerColor,
        },
        hover: {
          background: color,
          border: '#FFFFFF',
        },
      },
      borderWidth: moduleTypeBorderWidth[node.ddd.moduleType] || 1.5,
      ddd: node.ddd,
      source_file: node.source_file,
      file_type: node.file_type,
      source_location: node.source_location,
      community: node.community,
      degree,
    };
  });

  const links = rawLinks
    .map((link, index) => {
      const from = link.source || link.from || link._src;
      const to = link.target || link.to || link._tgt;
      if (!from || !to) {
        return null;
      }

      return {
        id: `${from}__${to}__${index}`,
        from,
        to,
        relation: link.relation || link.label || 'related',
        confidence: link.confidence || 'UNKNOWN',
        source_file: link.source_file || '',
        source_location: link.source_location || '',
        dashes: Boolean(link.confidence && link.confidence !== 'EXTRACTED'),
        width: Math.max(1, Math.min(4, Number(link.weight) || 1)),
      };
    })
    .filter(Boolean);

  const moduleLegend = modules.map((moduleName) => ({
    key: moduleName,
    label: moduleName,
    color: moduleColors[moduleName] || '#888888',
    count: enrichedGraph.ddd.summary.aggregates[moduleName] || 0,
    moduleType:
      enrichedGraph.nodes.find((node) => node.ddd.module === moduleName)?.ddd
        .moduleType || 'auxiliary',
  }));

  const layerLegend = layers.map((layer) => ({
    key: layer,
    label: toTitleCase(layer),
    color: layerColors[layer] || '#888888',
    shape: layerShapes[layer] || 'dot',
    count: enrichedGraph.ddd.summary.layers[layer] || 0,
  }));

  return {
    meta: {
      boundedContext: enrichedGraph.ddd.boundedContext,
      generatedAt: enrichedGraph.ddd.generatedAt,
      nodeCount: nodes.length,
      edgeCount: links.length,
      architectureViolations: enrichedGraph.ddd.architectureViolations,
      summary: enrichedGraph.ddd.summary,
    },
    styles: {
      moduleColors,
      layerColors,
      layerShapes,
    },
    legends: {
      modules: moduleLegend,
      layers: layerLegend,
    },
    nodes,
    links,
  };
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
  const visualization = buildVisualizationData(enrichedGraph);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>WeatherFlow DDD Graph</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <script src="https://unpkg.com/vis-network/standalone/umd/vis-network.min.js"></script>
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      html {
        height: 100%;
      }
      :root {
        color-scheme: dark;
        --bg: #08131f;
        --bg-panel: rgba(9, 22, 36, 0.96);
        --bg-panel-soft: rgba(17, 34, 52, 0.94);
        --bg-card: rgba(255, 255, 255, 0.05);
        --border: rgba(183, 201, 221, 0.18);
        --text: #eaf2fb;
        --text-muted: #9fb3c8;
        --text-dim: #6f8399;
        --accent: #76b7b2;
      }
      body {
        font-family: "Segoe UI", -apple-system, BlinkMacSystemFont, sans-serif;
        background:
          radial-gradient(circle at top left, rgba(78, 121, 167, 0.25), transparent 26%),
          radial-gradient(circle at top right, rgba(242, 142, 43, 0.18), transparent 24%),
          linear-gradient(135deg, #06101a 0%, #0a1725 45%, #0d1d2d 100%);
        color: var(--text);
        height: 100%;
        min-height: 100vh;
        overflow: hidden;
      }
      .app {
        display: flex;
        height: 100vh;
        min-height: 100vh;
        overflow: hidden;
      }
      #graph {
        flex: 1;
        min-height: 0;
        height: 100%;
      }
      #sidebar {
        width: 360px;
        max-width: 100%;
        background: var(--bg-panel);
        border-left: 1px solid var(--border);
        display: flex;
        flex-direction: column;
        backdrop-filter: blur(14px);
        height: 100%;
        min-height: 0;
        overflow: hidden;
      }
      .section {
        padding: 16px 18px;
        border-bottom: 1px solid var(--border);
      }
      .header {
        padding: 20px 18px 14px;
      }
      .eyebrow {
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.14em;
        color: var(--text-dim);
        margin-bottom: 8px;
      }
      h1 {
        font-size: 22px;
        line-height: 1.15;
        margin-bottom: 8px;
      }
      .subtle {
        color: var(--text-muted);
        font-size: 13px;
        line-height: 1.5;
      }
      .mini-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;
        margin-top: 14px;
      }
      .metric {
        background: var(--bg-card);
        border: 1px solid var(--border);
        border-radius: 12px;
        padding: 10px 12px;
      }
      .metric strong {
        display: block;
        font-size: 18px;
        margin-bottom: 4px;
      }
      .metric span {
        color: var(--text-muted);
        font-size: 12px;
      }
      .section-title {
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        color: var(--text-dim);
        margin-bottom: 10px;
      }
      .controls {
        display: grid;
        gap: 10px;
      }
      .control-row {
        display: grid;
        gap: 6px;
      }
      label {
        font-size: 12px;
        color: var(--text-muted);
      }
      input, select, button {
        width: 100%;
        border: 1px solid var(--border);
        background: rgba(5, 14, 24, 0.85);
        color: var(--text);
        border-radius: 10px;
        padding: 9px 11px;
        font-size: 13px;
      }
      input:focus, select:focus, button:focus {
        outline: none;
        border-color: rgba(118, 183, 178, 0.8);
        box-shadow: 0 0 0 3px rgba(118, 183, 178, 0.15);
      }
      .button-row {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 8px;
      }
      button {
        cursor: pointer;
      }
      button:hover {
        border-color: rgba(118, 183, 178, 0.6);
      }
      #search-results {
        display: none;
        margin-top: 6px;
        max-height: 180px;
        overflow-y: auto;
        border: 1px solid var(--border);
        border-radius: 12px;
        background: rgba(5, 14, 24, 0.98);
      }
      .search-item {
        padding: 10px 12px;
        border-bottom: 1px solid rgba(183, 201, 221, 0.08);
        cursor: pointer;
      }
      .search-item:last-child {
        border-bottom: none;
      }
      .search-item:hover {
        background: rgba(255, 255, 255, 0.05);
      }
      .search-item small {
        display: block;
        color: var(--text-dim);
        margin-top: 4px;
      }
      #info-panel {
        min-height: 190px;
      }
      .info-name {
        font-size: 18px;
        margin-bottom: 10px;
      }
      .info-list {
        display: grid;
        gap: 6px;
        font-size: 13px;
        line-height: 1.45;
      }
      .info-list b {
        color: var(--text-muted);
      }
      .empty {
        color: var(--text-dim);
        font-style: italic;
        font-size: 13px;
      }
      .pill-row {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-top: 10px;
      }
      .pill {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 10px;
        border-radius: 999px;
        border: 1px solid var(--border);
        background: rgba(255, 255, 255, 0.04);
        font-size: 12px;
        color: var(--text-muted);
      }
      .pill-dot {
        width: 9px;
        height: 9px;
        border-radius: 50%;
      }
      #legend-wrap {
        flex: 1;
        overflow-y: auto;
      }
      .legend-group + .legend-group {
        margin-top: 16px;
      }
      .legend-list {
        display: grid;
        gap: 6px;
      }
      .legend-item {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 9px 10px;
        border-radius: 10px;
        cursor: pointer;
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid transparent;
      }
      .legend-item:hover {
        border-color: var(--border);
      }
      .legend-item.dimmed {
        opacity: 0.35;
      }
      .legend-swatch {
        width: 14px;
        height: 14px;
        border-radius: 50%;
        flex-shrink: 0;
        border: 2px solid rgba(255, 255, 255, 0.45);
      }
      .legend-shape {
        width: 14px;
        height: 14px;
        flex-shrink: 0;
      }
      .legend-label {
        flex: 1;
        font-size: 13px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .legend-count {
        color: var(--text-dim);
        font-size: 12px;
      }
      .violations {
        margin-top: 10px;
        display: grid;
        gap: 8px;
      }
      .violation {
        padding: 9px 10px;
        border-radius: 10px;
        border: 1px solid var(--border);
        background: rgba(225, 87, 89, 0.09);
        font-size: 12px;
        color: #ffd6d6;
      }
      .violation.good {
        background: rgba(89, 161, 79, 0.12);
        color: #d2f3d3;
      }
      .footer {
        color: var(--text-dim);
        font-size: 11px;
        line-height: 1.5;
      }
      @media (max-width: 980px) {
        body {
          height: auto;
          overflow: auto;
        }
        .app {
          flex-direction: column;
          height: auto;
          min-height: 100vh;
          overflow: visible;
        }
        #graph {
          min-height: 58vh;
          height: 58vh;
        }
        #sidebar {
          width: 100%;
          border-left: none;
          border-top: 1px solid var(--border);
          height: auto;
        }
      }
    </style>
  </head>
  <body>
    <div class="app">
      <div id="graph"></div>
      <aside id="sidebar">
        <div class="header">
          <div class="eyebrow">DDD-Aware Graph</div>
          <h1>WeatherFlow</h1>
          <p class="subtle">Interactive bounded-context graph using module, module type, layer, and role metadata from the enriched DDD pipeline.</p>
          <div class="mini-grid">
            <div class="metric"><strong>${visualization.meta.nodeCount}</strong><span>Nodes</span></div>
            <div class="metric"><strong>${visualization.meta.edgeCount}</strong><span>Edges</span></div>
            <div class="metric"><strong>${Object.keys(visualization.meta.summary.aggregates).length}</strong><span>Modules</span></div>
            <div class="metric"><strong>${Object.keys(visualization.meta.summary.layers).length}</strong><span>Layers</span></div>
          </div>
        </div>
        <div class="section">
          <div class="section-title">Controls</div>
          <div class="controls">
            <div class="control-row">
              <label for="search">Search nodes</label>
              <input id="search" type="text" placeholder="User, WeatherStation, Controller..." autocomplete="off" />
              <div id="search-results"></div>
            </div>
            <div class="control-row">
              <label for="color-mode">Color mode</label>
              <select id="color-mode">
                <option value="module">Module</option>
                <option value="layer">Layer</option>
              </select>
            </div>
            <div class="control-row">
              <label for="layer-filter">Filter by layer</label>
              <select id="layer-filter">
                <option value="">All layers</option>
              </select>
            </div>
            <div class="control-row">
              <label for="module-filter">Filter by module</label>
              <select id="module-filter">
                <option value="">All modules</option>
              </select>
            </div>
            <div class="button-row">
              <button id="reset-view" type="button">Reset view</button>
              <button id="clear-filters" type="button">Clear filters</button>
            </div>
          </div>
        </div>
        <div class="section" id="info-panel">
          <div class="section-title">Node Details</div>
          <div id="info-content"><span class="empty">Click a node to inspect its DDD classification and connections.</span></div>
        </div>
        <div class="section" id="legend-wrap">
          <div class="section-title">Legend</div>
          <div class="legend-group">
            <div class="section-title">Modules</div>
            <div id="module-legend" class="legend-list"></div>
          </div>
          <div class="legend-group">
            <div class="section-title">Layers</div>
            <div id="layer-legend" class="legend-list"></div>
          </div>
        </div>
        <div class="section">
          <div class="section-title">Architecture</div>
          <div id="violations"></div>
        </div>
        <div class="section footer">
          Generated from <code>graphify-out/ddd-graph.json</code><br />
          Module color and layer shape stay DDD-aware even when you switch color mode.
        </div>
      </aside>
    </div>
    <script>
      const GRAPH_DATA = ${serializeForScript(visualization)};

      const graphContainer = document.getElementById('graph');
      const searchInput = document.getElementById('search');
      const searchResults = document.getElementById('search-results');
      const colorModeSelect = document.getElementById('color-mode');
      const layerFilterSelect = document.getElementById('layer-filter');
      const moduleFilterSelect = document.getElementById('module-filter');
      const infoContent = document.getElementById('info-content');
      const moduleLegendEl = document.getElementById('module-legend');
      const layerLegendEl = document.getElementById('layer-legend');
      const violationsEl = document.getElementById('violations');

      const hiddenModules = new Set();
      const hiddenLayers = new Set();
      let activeNodeId = null;
      let hoveredNodeId = null;

      function esc(value) {
        return String(value)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;');
      }

      function titleCase(value) {
        return String(value || '')
          .split('-')
          .filter(Boolean)
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(' ');
      }

      function getNodeColor(node, mode) {
        if (mode === 'layer') {
          return GRAPH_DATA.styles.layerColors[node.ddd.layer] || '#888888';
        }
        return GRAPH_DATA.styles.moduleColors[node.ddd.module] || '#888888';
      }

      function getLayerBorderColor(node) {
        return GRAPH_DATA.styles.layerColors[node.ddd.layer] || '#888888';
      }

      function buildNodeRecord(node) {
        const fill = getNodeColor(node, colorModeSelect.value);
        const border = getLayerBorderColor(node);
        return {
          id: node.id,
          label: node.label,
          title: node.title,
          shape: node.shape,
          size: node.size,
          hidden: false,
          borderWidth: node.borderWidth,
          font: node.font,
          color: {
            background: fill,
            border,
            highlight: { background: '#FFFFFF', border },
            hover: { background: fill, border: '#FFFFFF' },
          },
          _ddd: node.ddd,
          _degree: node.degree,
          _source_file: node.source_file,
          _source_location: node.source_location,
          _file_type: node.file_type,
          _community: node.community,
        };
      }

      const nodesDS = new vis.DataSet(GRAPH_DATA.nodes.map(buildNodeRecord));
      const edgesDS = new vis.DataSet(
        GRAPH_DATA.links.map((link) => ({
          id: link.id,
          from: link.from,
          to: link.to,
          hidden: false,
          width: link.width,
          dashes: link.dashes,
          color: { color: 'rgba(180, 200, 220, 0.28)', highlight: '#FFFFFF', hover: '#FFFFFF', opacity: 0.9 },
          smooth: { type: 'continuous', roundness: 0.18 },
          arrows: { to: { enabled: true, scaleFactor: 0.45 } },
          title: link.relation + ' [' + link.confidence + ']',
          _relation: link.relation,
          _confidence: link.confidence,
          _source_file: link.source_file,
          _source_location: link.source_location,
        })),
      );

      const network = new vis.Network(
        graphContainer,
        { nodes: nodesDS, edges: edgesDS },
        {
          autoResize: true,
          physics: {
            enabled: true,
            solver: 'forceAtlas2Based',
            forceAtlas2Based: {
              gravitationalConstant: -65,
              centralGravity: 0.006,
              springLength: 120,
              springConstant: 0.08,
              damping: 0.45,
              avoidOverlap: 0.95,
            },
            stabilization: { iterations: 220, fit: true },
          },
          interaction: {
            hover: true,
            tooltipDelay: 100,
            hideEdgesOnDrag: true,
            multiselect: false,
            zoomView: true,
            dragView: true,
          },
          nodes: {
            shadow: { enabled: true, color: 'rgba(0, 0, 0, 0.35)', size: 12, x: 0, y: 6 },
          },
          edges: {
            selectionWidth: 2.8,
            shadow: false,
          },
        },
      );

      network.once('stabilizationIterationsDone', () => {
        network.setOptions({ physics: { enabled: false } });
      });

      function populateSelect(select, items, formatter) {
        items.forEach((item) => {
          const option = document.createElement('option');
          option.value = item.key;
          option.textContent = formatter(item);
          select.appendChild(option);
        });
      }

      populateSelect(layerFilterSelect, GRAPH_DATA.legends.layers, (item) => item.label);
      populateSelect(moduleFilterSelect, GRAPH_DATA.legends.modules, (item) => item.label);

      function renderViolations() {
        const violations = GRAPH_DATA.meta.architectureViolations || [];
        if (!violations.length) {
          violationsEl.innerHTML = '<div class="violations"><div class="violation good">No DDD boundary violations detected in the current enriched graph.</div></div>';
          return;
        }

        violationsEl.innerHTML =
          '<div class="violations">' +
          violations.map((violation) => '<div class="violation">' + esc(violation) + '</div>').join('') +
          '</div>';
      }

      function renderLegends() {
        moduleLegendEl.innerHTML = '';
        layerLegendEl.innerHTML = '';

        GRAPH_DATA.legends.modules.forEach((item) => {
          const el = document.createElement('div');
          el.className = 'legend-item' + (hiddenModules.has(item.key) ? ' dimmed' : '');
          el.innerHTML =
            '<span class="legend-swatch" style="background:' + esc(item.color) + ';border-color:' + esc(GRAPH_DATA.styles.layerColors.domain) + '"></span>' +
            '<span class="legend-label">' + esc(item.label) + '</span>' +
            '<span class="legend-count">' + esc(item.count) + '</span>';
          el.onclick = () => {
            if (hiddenModules.has(item.key)) {
              hiddenModules.delete(item.key);
            } else {
              hiddenModules.add(item.key);
            }
            applyFilters();
            renderLegends();
          };
          moduleLegendEl.appendChild(el);
        });

        GRAPH_DATA.legends.layers.forEach((item) => {
          const el = document.createElement('div');
          el.className = 'legend-item' + (hiddenLayers.has(item.key) ? ' dimmed' : '');
          el.innerHTML =
            '<svg class="legend-shape" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="6" fill="' + esc(item.color) + '" stroke="rgba(255,255,255,0.65)" stroke-width="2"></circle></svg>' +
            '<span class="legend-label">' + esc(item.label) + '</span>' +
            '<span class="legend-count">' + esc(item.count) + '</span>';
          el.onclick = () => {
            if (hiddenLayers.has(item.key)) {
              hiddenLayers.delete(item.key);
            } else {
              hiddenLayers.add(item.key);
            }
            applyFilters();
            renderLegends();
          };
          layerLegendEl.appendChild(el);
        });
      }

      function isNodeVisible(node) {
        const filterLayer = layerFilterSelect.value;
        const filterModule = moduleFilterSelect.value;

        if (filterLayer && node.ddd.layer !== filterLayer) {
          return false;
        }
        if (filterModule && node.ddd.module !== filterModule) {
          return false;
        }
        if (hiddenLayers.has(node.ddd.layer)) {
          return false;
        }
        if (hiddenModules.has(node.ddd.module)) {
          return false;
        }

        return true;
      }

      function applyFilters() {
        const visibleNodeIds = new Set();
        const nodeUpdates = GRAPH_DATA.nodes.map((node) => {
          const visible = isNodeVisible(node);
          if (visible) {
            visibleNodeIds.add(node.id);
          }

          const fill = getNodeColor(node, colorModeSelect.value);
          const border = getLayerBorderColor(node);

          return {
            id: node.id,
            hidden: !visible,
            color: {
              background: fill,
              border,
              highlight: { background: '#FFFFFF', border },
              hover: { background: fill, border: '#FFFFFF' },
            },
          };
        });

        const edgeUpdates = GRAPH_DATA.links.map((link) => ({
          id: link.id,
          hidden: !(visibleNodeIds.has(link.from) && visibleNodeIds.has(link.to)),
        }));

        nodesDS.update(nodeUpdates);
        edgesDS.update(edgeUpdates);

        if (activeNodeId && !visibleNodeIds.has(activeNodeId)) {
          activeNodeId = null;
          infoContent.innerHTML = '<span class="empty">The selected node is hidden by the current filters.</span>';
          network.unselectAll();
        }
      }

      function showInfo(nodeId) {
        const node = nodesDS.get(nodeId);
        if (!node) {
          return;
        }

        activeNodeId = nodeId;
        const ddd = node._ddd;
        const connectedEdges = network.getConnectedEdges(nodeId)
          .map((edgeId) => edgesDS.get(edgeId))
          .filter(Boolean)
          .filter((edge) => !edge.hidden);
        const connectedNodes = network.getConnectedNodes(nodeId)
          .map((neighborId) => nodesDS.get(neighborId))
          .filter(Boolean)
          .filter((neighbor) => !neighbor.hidden)
          .sort((left, right) => left.label.localeCompare(right.label))
          .slice(0, 14);

        const neighborHtml = connectedNodes.length
          ? '<div class="pill-row">' +
            connectedNodes
              .map((neighbor) =>
                '<span class="pill" style="cursor:pointer" onclick="focusNode(' +
                JSON.stringify(neighbor.id) +
                ')"><span class="pill-dot" style="background:' +
                esc(getNodeColor({ ddd: neighbor._ddd }, colorModeSelect.value)) +
                '"></span>' +
                esc(neighbor.label) +
                '</span>',
              )
              .join('') +
            '</div>'
          : '<div class="empty" style="margin-top:10px">No visible neighbors under the current filters.</div>';

        const relationCounts = {};
        connectedEdges.forEach((edge) => {
          relationCounts[edge._relation] = (relationCounts[edge._relation] || 0) + 1;
        });
        const relationSummary = Object.keys(relationCounts).length
          ? Object.entries(relationCounts)
              .map(([relation, count]) => esc(relation) + ': ' + count)
              .join(' · ')
          : 'No visible relationships';

        infoContent.innerHTML =
          '<div class="info-name">' + esc(node.label) + '</div>' +
          '<div class="info-list">' +
            '<div><b>Module</b> ' + esc(ddd.module) + ' (' + esc(ddd.moduleType) + ')</div>' +
            '<div><b>Layer</b> ' + esc(ddd.layer) + '</div>' +
            '<div><b>Role</b> ' + esc(ddd.role) + '</div>' +
            '<div><b>Source</b> ' + esc(ddd.sourceFile || node._source_file || '-') + '</div>' +
            '<div><b>Location</b> ' + esc(node._source_location || '-') + '</div>' +
            '<div><b>Degree</b> ' + esc(node._degree) + '</div>' +
            '<div><b>Relations</b> ' + relationSummary + '</div>' +
          '</div>' +
          '<div class="pill-row" style="margin-top:12px">' +
            '<span class="pill"><span class="pill-dot" style="background:' + esc(getNodeColor({ ddd }, colorModeSelect.value)) + '"></span>Color key</span>' +
            '<span class="pill"><span class="pill-dot" style="background:' + esc(getLayerBorderColor({ ddd })) + '"></span>Layer border</span>' +
          '</div>' +
          '<div class="section-title" style="margin-top:14px;margin-bottom:8px">Visible neighbors</div>' +
          neighborHtml;
      }

      function focusNode(nodeId) {
        const node = nodesDS.get(nodeId);
        if (!node || node.hidden) {
          return;
        }
        network.focus(nodeId, { scale: 1.35, animation: true });
        network.selectNodes([nodeId]);
        showInfo(nodeId);
      }

      function resetView() {
        network.fit({ animation: true });
      }

      function clearFilters() {
        layerFilterSelect.value = '';
        moduleFilterSelect.value = '';
        searchInput.value = '';
        hiddenModules.clear();
        hiddenLayers.clear();
        applyFilters();
        renderLegends();
        searchResults.style.display = 'none';
      }

      function updateSearchResults() {
        const query = searchInput.value.toLowerCase().trim();
        searchResults.innerHTML = '';

        if (!query) {
          searchResults.style.display = 'none';
          return;
        }

        const matches = GRAPH_DATA.nodes
          .filter((node) => isNodeVisible(node))
          .filter((node) => node.label.toLowerCase().includes(query))
          .slice(0, 18);

        if (!matches.length) {
          searchResults.style.display = 'none';
          return;
        }

        matches.forEach((node) => {
          const item = document.createElement('div');
          item.className = 'search-item';
          item.style.borderLeft = '4px solid ' + getNodeColor(node, colorModeSelect.value);
          item.style.paddingLeft = '10px';
          item.innerHTML =
            esc(node.label) +
            '<small>' + esc(node.ddd.module) + ' · ' + esc(node.ddd.layer) + ' · ' + esc(node.ddd.role) + '</small>';
          item.onclick = () => {
            searchResults.style.display = 'none';
            focusNode(node.id);
          };
          searchResults.appendChild(item);
        });

        searchResults.style.display = 'block';
      }

      network.on('hoverNode', (params) => {
        hoveredNodeId = params.node;
        graphContainer.style.cursor = 'pointer';
      });

      network.on('blurNode', () => {
        hoveredNodeId = null;
        graphContainer.style.cursor = 'default';
      });

      network.on('click', (params) => {
        if (params.nodes.length) {
          showInfo(params.nodes[0]);
          return;
        }
        if (hoveredNodeId) {
          showInfo(hoveredNodeId);
          network.selectNodes([hoveredNodeId]);
          return;
        }
        activeNodeId = null;
        infoContent.innerHTML = '<span class="empty">Click a node to inspect its DDD classification and connections.</span>';
      });

      searchInput.addEventListener('input', updateSearchResults);
      colorModeSelect.addEventListener('change', () => {
        applyFilters();
        updateSearchResults();
        if (activeNodeId) {
          showInfo(activeNodeId);
        }
      });
      layerFilterSelect.addEventListener('change', () => {
        applyFilters();
        updateSearchResults();
      });
      moduleFilterSelect.addEventListener('change', () => {
        applyFilters();
        updateSearchResults();
      });
      document.getElementById('reset-view').addEventListener('click', resetView);
      document.getElementById('clear-filters').addEventListener('click', clearFilters);
      document.addEventListener('click', (event) => {
        if (!searchResults.contains(event.target) && event.target !== searchInput) {
          searchResults.style.display = 'none';
        }
      });

      renderViolations();
      renderLegends();
      applyFilters();

      window.focusNode = focusNode;
    </script>
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
