import type { Entity } from '../../entities/Entity';
import type { EntitySystem } from './EntitySystem';

export class EntityTimingSystem implements EntitySystem {
  readonly id = 'core:entity_timing';
  enabled = true;

  tick(entities: Entity[], delta: number): void {
    for (const entity of entities) {
      if (!entity.active || entity.getIsDead()) continue;
      entity.tickTimeDelta(delta);
    }
  }
}
