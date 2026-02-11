import type { Entity } from '../../entities/Entity';
import type { EntitySystem } from './EntitySystem';

export class EntityRenderSystem implements EntitySystem {
  readonly id = 'core:entity_render';
  enabled = true;

  tick(entities: Entity[], delta: number): void {
    for (const entity of entities) {
      if (!entity.active || entity.getIsDead()) continue;
      entity.tickRender(delta);
    }
  }
}
