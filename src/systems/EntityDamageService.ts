import { Data } from '../data/DataManager';
import { EventBus, GameEvents } from '../utils/EventBus';
import { DishDamageResolver } from '../entities/dish/DishDamageResolver';
import { DishEventPayloadFactory } from '../entities/dish/DishEventPayloadFactory';
import { createEntitySnapshot } from '../entities/EntitySnapshot';
import type { Entity } from '../entities/Entity';
import type { World } from '../world';
import type { StatusEffectManager } from './StatusEffectManager';

/**
 * EntityDamageService: 데미지 계산, 이벤트 발행, 상태효과를 Entity에서 분리.
 * World 스토어를 직접 읽고/쓰며, entityLookup으로 Entity 참조를 획득한다.
 */
export class EntityDamageService {
  constructor(
    private readonly world: World,
    private readonly sem: StatusEffectManager,
    private readonly entityLookup: (entityId: string) => Entity | undefined,
  ) {}

  // === Cursor interaction ===

  setInCursorRange(entityId: string, inRange: boolean): void {
    const ci = this.world.cursorInteraction.get(entityId);
    const interaction = ci?.cursorInteractionType ?? 'dps';
    const entity = this.entityLookup(entityId);
    if (!entity) return;

    if (inRange && !(ci?.isHovered)) {
      if (ci) ci.isHovered = true;

      if (interaction === 'explode') {
        this.explode(entityId);
        return;
      }

      if (interaction === 'dps') {
        this.startDamaging(entityId);
      }
    } else if (!inRange && ci?.isHovered) {
      ci.isHovered = false;
      if (interaction === 'dps') {
        this.stopDamaging(entityId);
      }
    }
  }

  private startDamaging(entityId: string): void {
    const entity = this.entityLookup(entityId);
    if (!entity?.active) return;

    const dp = this.world.dishProps.get(entityId);
    if (dp?.invulnerable) return;

    const ci = this.world.cursorInteraction.get(entityId);
    if (!ci || ci.isBeingDamaged) return;

    ci.isBeingDamaged = true;
    this.takeDamageFromCursor(entityId, true);

    entity.setDamageTimer(entity.scene.time.addEvent({
      delay: ci.damageInterval,
      callback: () => this.takeDamageFromCursor(entityId, false),
      loop: true,
    }));
  }

  private stopDamaging(entityId: string): void {
    const ci = this.world.cursorInteraction.get(entityId);
    if (ci) ci.isBeingDamaged = false;

    const entity = this.entityLookup(entityId);
    entity?.clearDamageTimer();
  }

  private takeDamageFromCursor(entityId: string, isFirstHit: boolean): void {
    const entity = this.entityLookup(entityId);
    if (!entity?.active) return;

    const dp = this.world.dishProps.get(entityId);
    if (dp?.invulnerable) return;

    const health = this.world.health.get(entityId);
    if (!health) return;

    const damageConfig = Data.dishes.damage;
    const upgradeOptions = dp?.upgradeOptions ?? {};
    const { damage, isCritical } = DishDamageResolver.resolveCursorDamage(damageConfig, upgradeOptions);

    health.currentHp -= damage;

    const vs = this.world.visualState.get(entityId);
    if (vs) vs.hitFlashPhase = 1;

    const snapshot = createEntitySnapshot(this.world, entityId);
    EventBus.getInstance().emit(
      GameEvents.DISH_DAMAGED,
      DishEventPayloadFactory.createDishDamagedPayload({
        snapshot, damage,
        currentHp: health.currentHp, maxHp: health.maxHp,
        isFirstHit, isCritical, byAbility: false,
      })
    );

    this.invokePluginOnDamaged(entityId, damage, 'cursor');
    if (health.currentHp <= 0) this.destroyEntity(entityId);
  }

  // === Ability damage ===

  applyDamage(entityId: string, damage: number): void {
    const entity = this.entityLookup(entityId);
    if (!entity?.active) return;

    const dp = this.world.dishProps.get(entityId);
    if (dp?.invulnerable) return;

    if (dp) dp.destroyedByAbility = true;

    const health = this.world.health.get(entityId);
    if (!health) return;

    health.currentHp -= damage;

    const vs = this.world.visualState.get(entityId);
    if (vs) vs.hitFlashPhase = 1;

    const snapshot = createEntitySnapshot(this.world, entityId);
    EventBus.getInstance().emit(
      GameEvents.DISH_DAMAGED,
      DishEventPayloadFactory.createDishDamagedPayload({
        snapshot, damage,
        currentHp: health.currentHp, maxHp: health.maxHp,
        isFirstHit: false, byAbility: true,
      })
    );

    this.invokePluginOnDamaged(entityId, damage, 'ability');
    if (health.currentHp <= 0) this.destroyEntity(entityId);
  }

  // === Upgrade damage ===

  applyUpgradeDamage(entityId: string, baseDamage: number, damageBonus: number, criticalChanceBonus: number): void {
    const entity = this.entityLookup(entityId);
    if (!entity?.active) return;

    const dp = this.world.dishProps.get(entityId);
    if (dp?.invulnerable) return;

    const health = this.world.health.get(entityId);
    if (!health) return;

    const damageConfig = Data.dishes.damage;
    const { damage: totalDamage, isCritical } = DishDamageResolver.resolveUpgradeDamage(
      damageConfig, baseDamage, damageBonus, criticalChanceBonus
    );

    health.currentHp -= totalDamage;
    if (dp) dp.destroyedByAbility = true;

    const vs = this.world.visualState.get(entityId);
    if (vs) vs.hitFlashPhase = 1;

    const snapshot = createEntitySnapshot(this.world, entityId);
    EventBus.getInstance().emit(
      GameEvents.DISH_DAMAGED,
      DishEventPayloadFactory.createDishDamagedPayload({
        snapshot, damage: totalDamage,
        currentHp: health.currentHp, maxHp: health.maxHp,
        isFirstHit: false, isCritical, byAbility: true,
      })
    );

    if (health.currentHp <= 0) this.destroyEntity(entityId);
  }

  // === Boss contact damage ===

  applyContactDamage(entityId: string, damage: number, sourceX: number, sourceY: number): void {
    const entity = this.entityLookup(entityId);
    if (!entity?.active || entity.getIsDead()) return;

    const health = this.world.health.get(entityId);
    if (!health) return;

    health.currentHp = Math.max(0, health.currentHp - damage);

    const bs = this.world.bossState.get(entityId);
    if (bs) {
      bs.pendingDamageReaction = true;
      bs.damageSourceX = sourceX;
      bs.damageSourceY = sourceY;
    }

    this.invokePluginOnDamaged(entityId, damage, 'cursor');

    if (health.currentHp <= 0) {
      entity.markDead();
      if (bs) bs.pendingDeathAnimation = true;
      this.invokePluginOnDestroyed(entityId);
      EventBus.getInstance().emit(GameEvents.MONSTER_DIED, { bossId: entityId });
    }
  }

  // === External HP change (MonsterSystem) ===

  handleExternalHpChange(entityId: string, currentHp: number, maxHp: number, sourceX?: number, sourceY?: number): void {
    const entity = this.entityLookup(entityId);
    if (!entity || entity.getIsDead()) return;

    const health = this.world.health.get(entityId);
    if (!health) return;

    health.currentHp = Math.max(0, Math.floor(currentHp));
    health.maxHp = Math.max(1, Math.floor(maxHp));

    const bs = this.world.bossState.get(entityId);
    if (bs && sourceX !== undefined && sourceY !== undefined) {
      bs.pendingDamageReaction = true;
      bs.damageSourceX = sourceX;
      bs.damageSourceY = sourceY;
    }

    if (health.currentHp <= 0) {
      entity.markDead();
      if (bs) bs.pendingDeathAnimation = true;
    }
  }

  // === Force destroy ===

  forceDestroy(entityId: string, byAbility: boolean = true): void {
    const entity = this.entityLookup(entityId);
    if (!entity?.active) return;

    const dp = this.world.dishProps.get(entityId);
    if (dp) dp.destroyedByAbility = byAbility;

    this.destroyEntity(entityId);
  }

  // === Explode (bomb interaction) ===

  explode(entityId: string): void {
    const entity = this.entityLookup(entityId);
    if (!entity?.active) return;

    entity.active = false;
    entity.clearDamageTimer();
    entity.disableInteractive();
    entity.removeAllListeners();

    const snapshot = createEntitySnapshot(this.world, entityId);
    EventBus.getInstance().emit(
      GameEvents.DISH_DESTROYED,
      DishEventPayloadFactory.createDishDestroyedPayload({ snapshot })
    );

    this.invokePluginOnDestroyed(entityId);
    entity.deactivate();
  }

  // === Timeout ===

  handleTimeout(entityId: string): void {
    const entity = this.entityLookup(entityId);
    if (!entity?.active) return;

    entity.clearDamageTimer();

    const dp = this.world.dishProps.get(entityId);
    const snapshot = createEntitySnapshot(this.world, entityId);
    const eventData = DishEventPayloadFactory.createDishMissedPayload({
      snapshot,
      isDangerous: dp?.dangerous ?? false,
    });

    entity.deactivate();
    this.invokePluginOnTimeout(entityId);
    EventBus.getInstance().emit(GameEvents.DISH_MISSED, eventData);
  }

  // === Status effects ===

  applySlow(entityId: string, duration: number, factor: number = 0.3): void {
    const entity = this.entityLookup(entityId);
    if (!entity?.active) return;

    const effectId = `${entityId}:slow`;
    this.sem.removeEffect(entityId, effectId);
    this.sem.applyEffect(entityId, {
      id: effectId,
      type: 'slow',
      duration,
      remaining: duration,
      data: { factor },
    });
  }

  freeze(entityId: string): void {
    const effectId = `${entityId}:freeze`;
    this.sem.applyEffect(entityId, {
      id: effectId,
      type: 'freeze',
      duration: Infinity,
      remaining: Infinity,
      data: {},
    });
  }

  unfreeze(entityId: string): void {
    this.sem.removeEffect(entityId, `${entityId}:freeze`);
  }

  // === Magnet ===

  setBeingPulled(entityId: string, pulled: boolean): void {
    const vs = this.world.visualState.get(entityId);
    if (vs) vs.isBeingPulled = pulled;
  }

  // === Plugin helpers (World 스토어에서 typePlugin 조회) ===

  private getTypePlugin(entityId: string) {
    const node = this.world.phaserNode.get(entityId);
    if (!node) return null;
    const entity = node.container as Entity;
    return entity.getTypePlugin();
  }

  private invokePluginOnDamaged(entityId: string, damage: number, source: string): void {
    const plugin = this.getTypePlugin(entityId);
    plugin?.onDamaged?.(entityId, this.world, damage, source as import('../plugins/types').DamageSource);
  }

  private invokePluginOnDestroyed(entityId: string): void {
    const plugin = this.getTypePlugin(entityId);
    plugin?.onDestroyed?.(entityId, this.world);
  }

  private invokePluginOnTimeout(entityId: string): void {
    const plugin = this.getTypePlugin(entityId);
    plugin?.onTimeout?.(entityId, this.world);
  }

  // === Private: standard destroy ===

  private destroyEntity(entityId: string): void {
    const entity = this.entityLookup(entityId);
    if (!entity) return;

    entity.active = false;
    entity.clearDamageTimer();
    entity.disableInteractive();
    entity.removeAllListeners();

    const dp = this.world.dishProps.get(entityId);
    const snapshot = createEntitySnapshot(this.world, entityId);
    EventBus.getInstance().emit(
      GameEvents.DISH_DESTROYED,
      DishEventPayloadFactory.createDishDestroyedPayload({
        snapshot,
        byAbility: dp?.destroyedByAbility,
      })
    );

    this.invokePluginOnDestroyed(entityId);
    entity.deactivate();
  }
}
