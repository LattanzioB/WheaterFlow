export interface GraphNodeInput {
  label?: string;
  source_file?: string;
}

export interface NodeClassification {
  boundedContext: string;
  module: string;
  moduleType: 'aggregate' | 'supporting-module' | 'auxiliary';
  layer: string;
  role: string;
  sourceFile: string;
}

export interface GraphNodeWithDdd extends GraphNodeInput {
  ddd: NodeClassification;
}

export interface EnrichedGraph {
  nodes: GraphNodeWithDdd[];
  edges: unknown[];
  ddd: {
    boundedContext: string;
    generatedAt: string;
    summary: {
      aggregates: Record<string, number>;
      layers: Record<string, number>;
      roles: Record<string, number>;
    };
    architectureViolations: string[];
  };
}

export function classifyNode(node: GraphNodeInput): NodeClassification;
export function collectArchitectureViolations(repoRoot: string): string[];
export function createEnrichedGraph(
  graphData: { nodes?: GraphNodeInput[]; edges?: unknown[] },
  repoRoot: string,
): EnrichedGraph;
