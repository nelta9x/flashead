import type { Entity } from '../../entities/Entity';
import type { EntitySystem } from './EntitySystem';

export class EntityStatusSystem implements EntitySystem {
  readonly id = 'core:entity_status';
  enabled = true;

  tick(entities: Entity[], _delta: number): void {
    for (const entity of entities) {
      if (!entity.active || entity.getIsDead()) continue;
      entity.tickStatusEffects();
    }
  }
}
