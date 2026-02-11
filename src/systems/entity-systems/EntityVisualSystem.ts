import type { Entity } from '../../entities/Entity';
import type { EntitySystem } from './EntitySystem';

export class EntityVisualSystem implements EntitySystem {
  readonly id = 'core:entity_visual';
  enabled = true;

  tick(entities: Entity[], delta: number): void {
    for (const entity of entities) {
      if (!entity.active || entity.getIsDead()) continue;
      entity.tickVisual(delta);
    }
  }
}
