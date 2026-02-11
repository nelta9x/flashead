import type { Entity } from '../../entities/Entity';
import type { EntitySystem } from './EntitySystem';

export class EntityMovementSystem implements EntitySystem {
  readonly id = 'core:entity_movement';
  enabled = true;

  tick(entities: Entity[], delta: number): void {
    for (const entity of entities) {
      if (!entity.active || entity.getIsDead()) continue;
      entity.tickMovement(delta);
    }
  }
}
