import type { EntitySnapshot } from '../../entities/EntitySnapshot';

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

export interface DishDestroyedEventPayload {
  snapshot: EntitySnapshot;
  x: number;
  y: number;
  type?: string;
  byAbility?: boolean;
}

export interface DishDamagedEventPayload {
  snapshot: EntitySnapshot;
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
  snapshot: EntitySnapshot;
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
