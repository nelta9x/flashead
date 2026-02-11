import type { DishUpgradeOptions } from '../../entities/EntityTypes';

export interface CursorSnapshot {
  x: number;
  y: number;
}

export interface BossTargetSnapshot {
  id: string;
  x: number;
  y: number;
}

export interface BossRadiusSnapshot {
  id: string;
  x: number;
  y: number;
  radius: number;
}

export interface BossVisibilitySnapshot extends BossTargetSnapshot {
  visible: boolean;
}

/**
 * Dish/Entity 공통 인터페이스.
 * 이벤트 페이로드와 소비자에서 Dish와 Entity를 모두 수용.
 */
export interface DishLike {
  readonly x: number;
  readonly y: number;
  readonly active: boolean;
  isDangerous(): boolean;
  getDishType(): string;
  getColor(): number;
  getSize(): number;
  getCurrentHp(): number;
  getMaxHp(): number;
  getHpRatio(): number;
  isFullySpawned(): boolean;
  isSlowed(): boolean;
  setInCursorRange(inRange: boolean): void;
  setBeingPulled(pulled: boolean): void;
  applyDamage(damage: number): void;
  applyDamageWithUpgrades(
    baseDamage: number,
    damageBonus: number,
    criticalChanceBonus: number
  ): void;
  applySlow(duration: number, factor?: number): void;
  forceDestroy(byAbility?: boolean): void;
  deactivate(): void;
  getUpgradeOptions(): DishUpgradeOptions;
  getLifetime(): number;
  getTimeRatio(): number;
  getDamageInterval(): number;
  getInteractiveRadius(): number;
}

export interface DishDestroyedEventPayload {
  dish: DishLike;
  x: number;
  y: number;
  type?: string;
  byAbility?: boolean;
}

export interface DishDamagedEventPayload {
  dish: DishLike;
  x: number;
  y: number;
  type: string;
  damage: number;
  currentHp: number;
  maxHp: number;
  hpRatio: number;
  isFirstHit: boolean;
  byAbility?: boolean;
  isCritical?: boolean;
}

export interface DishMissedEventPayload {
  dish: DishLike;
  x: number;
  y: number;
  type: string;
  isDangerous: boolean;
}

export interface BossInteractionGateway {
  findNearestAliveBoss(x: number, y: number): BossTargetSnapshot | null;
  getAliveBossTarget(bossId: string): BossTargetSnapshot | null;
  cancelChargingLasers(bossId: string): void;
}

export interface DishSpawnDelegate {
  spawnDish(type: string, x: number, y: number, speedMultiplier: number): void;
}
