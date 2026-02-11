import type { Entity } from '../../entities/Entity';
import type { EntitySystem } from './EntitySystem';
import type { World } from '../../world';

export class EntityMovementSystem implements EntitySystem {
  readonly id = 'core:entity_movement';
  enabled = true;

  constructor(private readonly world: World) {}

  tick(_entities: Entity[], delta: number): void {
    this.world.movement.forEach((entityId, mov) => {
      if (entityId === 'player') return;
      if (!this.world.isActive(entityId)) return;

      const statusCache = this.world.statusCache.get(entityId);
      const isFrozen = statusCache?.isFrozen ?? false;
      const slowFactor = statusCache?.slowFactor ?? 1.0;
      const bossBeh = this.world.bossBehavior.get(entityId);
      const isStunned = bossBeh?.behavior.isHitStunned ?? false;
      const transform = this.world.transform.get(entityId);
      if (!transform) return;

      if (mov.strategy && !isFrozen && !isStunned) {
        const pos = mov.strategy.update(delta, isFrozen, isStunned);
        transform.baseX = pos.x;
        transform.baseY = pos.y;

        const shakeX = bossBeh?.behavior.shakeOffsetX ?? 0;
        const shakeY = bossBeh?.behavior.shakeOffsetY ?? 0;
        const pushX = bossBeh?.behavior.pushOffsetX ?? 0;
        const pushY = bossBeh?.behavior.pushOffsetY ?? 0;
        transform.x = transform.baseX + shakeX + pushX;
        transform.y = transform.baseY + shakeY + pushY;
      } else if (!mov.strategy) {
        const visualState = this.world.visualState.get(entityId);
        if (visualState) {
          visualState.wobblePhase += 0.1 * slowFactor;
        }
      }
    });
  }
}
