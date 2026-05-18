import {
  classifyNode,
  createEnrichedGraph,
} from '../../../../scripts/enrich-graphify-ddd.js';

describe('graphify DDD enrichment', () => {
  it('classifies aggregate nodes from their source path', () => {
    const classification = classifyNode({
      label: 'User',
      source_file: 'apps/api/src/modules/users/domain/entities/user.entity.ts',
    });

    expect(classification).toMatchObject({
      boundedContext: 'WeatherFlow',
      module: 'User',
      moduleType: 'aggregate',
      layer: 'domain',
      role: 'entity',
    });
  });

  it('marks auth as a supporting module', () => {
    const classification = classifyNode({
      label: 'AuthController',
      source_file:
        'apps/api/src/modules/auth/interface/controllers/auth.controller.ts',
    });

    expect(classification).toMatchObject({
      module: 'Auth',
      moduleType: 'supporting-module',
      layer: 'interface',
      role: 'controller',
    });
  });

  it('adds DDD metadata and summary data to a graph payload', () => {
    const enriched = createEnrichedGraph(
      {
        nodes: [
          {
            label: 'User',
            source_file:
              'apps/api/src/modules/users/domain/entities/user.entity.ts',
          },
          {
            label: 'NotificationService',
            source_file:
              'apps/notifications/src/modules/notifications/application/services/notification.service.ts',
          },
        ],
        edges: [],
      },
      process.cwd(),
    );

    expect(enriched.ddd.boundedContext).toBe('WeatherFlow');
    expect(enriched.ddd.summary.aggregates.User).toBe(1);
    expect(enriched.ddd.summary.aggregates.Notifications).toBe(1);
    expect(enriched.nodes[0].ddd.role).toBe('entity');
    expect(enriched.nodes[1].ddd.role).toBe('application-service');
  });
});
