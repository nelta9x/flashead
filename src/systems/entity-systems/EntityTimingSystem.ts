import type { Entity } from '../../entities/Entity';
import type { EntitySystem } from './EntitySystem';
import type { World } from '../../world';

export class EntityTimingSystem implements EntitySystem {
  readonly id = 'core:entity_timing';
  enabled = true;

  constructor(
    private readonly world: World,
    private readonly entityLookup: (entityId: string) => Entity | undefined,
  ) {}

  tick(_entities: Entity[], delta: number): void {
    this.world.lifetime.forEach((entityId, lifetime) => {
      if (entityId === 'player') return;
      if (!this.world.isActive(entityId)) return;

      const statusCache = this.world.statusCache.get(entityId);
      const slowFactor = statusCache?.slowFactor ?? 1.0;
      const globalSlowFactor = 1 - lifetime.globalSlowPercent;
      const effectiveDelta = delta * slowFactor * globalSlowFactor;

      lifetime.elapsedTime += effectiveDelta;
      lifetime.movementTime += delta;

      if (lifetime.lifetime !== null && lifetime.elapsedTime >= lifetime.lifetime) {
        const entity = this.entityLookup(entityId);
        entity?.handleTimeout();
      }
    });
  }
}
