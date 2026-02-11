import type Phaser from 'phaser';
import type { MovementStrategy } from './MovementStrategy';
import type { AttackPattern } from './AttackPattern';

/**
 * Entity가 구현할 최소 읽기 인터페이스
 * Phase 4에서 Entity 클래스가 이를 구현한다.
 */
export interface EntityRef {
  readonly x: number;
  readonly y: number;
  readonly active: boolean;
  getEntityId(): string;
  getEntityType(): string;
  getCurrentHp(): number;
  getMaxHp(): number;
  getHpRatio(): number;
  getSize(): number;
}

export type CursorInteractionType = 'dps' | 'contact' | 'explode' | 'none';

export interface EntityTypeConfig {
  poolSize: number;
  defaultLifetime: number | null;
  isGatekeeper: boolean;
  cursorInteraction: CursorInteractionType;
  archetypeId?: string;
}

/** 엔티티 타입별 렌더러 */
export interface EntityTypeRenderer {
  render(entity: EntityRef, timeElapsed: number): void;
  playHitFlash?(duration: number): void;
  destroy(): void;
}

export type DamageSource = 'cursor' | 'ability' | 'orb' | 'blackHole' | 'missile' | 'laser';

/**
 * 엔티티 타입 플러그인 인터페이스
 * - BasicDish: 일반 접시 타입들 (basic, golden, crystal, mini, amber)
 * - BombDish: 폭탄 접시
 * - StandardBoss: 표준 보스
 */
export interface EntityTypePlugin {
  readonly typeId: string;
  readonly config: EntityTypeConfig;

  createRenderer(scene: Phaser.Scene, host: Phaser.GameObjects.Container): EntityTypeRenderer;
  createMovementStrategy?(entityId: string): MovementStrategy | null;
  createAttackPatterns?(scene: Phaser.Scene, entityId: string): AttackPattern[];

  onSpawn?(entity: EntityRef): void;
  onUpdate?(entity: EntityRef, delta: number, gameTime: number): void;
  onCursorEnter?(entity: EntityRef): void;
  onCursorExit?(entity: EntityRef): void;
  onDamaged?(entity: EntityRef, damage: number, source: DamageSource): void;
  onDestroyed?(entity: EntityRef): void;
  onTimeout?(entity: EntityRef): void;
}
