import type { Entity } from '../../entities/Entity';
import type { EntitySystem } from './EntitySystem';
import type { World } from '../../world';
import { DishRenderer } from '../../effects/DishRenderer';

export class EntityRenderSystem implements EntitySystem {
  readonly id = 'core:entity_render';
  enabled = true;

  constructor(
    private readonly world: World,
    private readonly entityLookup: (entityId: string) => Entity | undefined,
  ) {}

  tick(_entities: Entity[], delta: number): void {
    this.world.phaserNode.forEach((entityId, node) => {
      if (entityId === 'player') return;
      if (!this.world.isActive(entityId)) return;

      // World transform → Phaser Container 동기화
      const transform = this.world.transform.get(entityId);
      if (transform) {
        node.container.x = transform.x;
        node.container.y = transform.y;
        node.container.alpha = transform.alpha;
        node.container.scaleX = transform.scaleX;
        node.container.scaleY = transform.scaleY;
      }

      // Drawing: World 스토어에서 직접 읽어 렌더링
      const identity = this.world.identity.get(entityId);
      const dishProps = this.world.dishProps.get(entityId);
      const health = this.world.health.get(entityId);
      const statusCache = this.world.statusCache.get(entityId);
      const visualState = this.world.visualState.get(entityId);
      const cursorInteraction = this.world.cursorInteraction.get(entityId);
      const bossBeh = this.world.bossBehavior.get(entityId);
      const lifetime = this.world.lifetime.get(entityId);

      if (identity?.isGatekeeper && bossBeh) {
        const hpRatio = health && health.maxHp > 0 ? health.currentHp / health.maxHp : 1;
        bossBeh.behavior.render(hpRatio, lifetime?.movementTime ?? 0);
      } else if (dishProps?.dangerous) {
        DishRenderer.renderDangerDish(node.graphics, {
          size: dishProps.size,
          blinkPhase: visualState?.blinkPhase ?? 0,
        });
      } else if (dishProps && health && visualState) {
        DishRenderer.renderDish(node.graphics, {
          size: dishProps.size,
          baseColor: dishProps.color,
          currentHp: health.currentHp,
          maxHp: health.maxHp,
          isHovered: cursorInteraction?.isHovered ?? false,
          isBeingPulled: visualState.isBeingPulled,
          pullPhase: visualState.pullPhase,
          hitFlashPhase: visualState.hitFlashPhase,
          isFrozen: statusCache?.isFrozen ?? false,
          wobblePhase: visualState.wobblePhase,
          blinkPhase: visualState.blinkPhase,
        });
      }

      // plugin.onUpdate (전이기: Entity lookup으로 EntityRef 전달)
      const entity = this.entityLookup(entityId);
      if (entity) {
        entity.tickPluginUpdate(delta, lifetime?.movementTime ?? 0);
      }
    });
  }
}
