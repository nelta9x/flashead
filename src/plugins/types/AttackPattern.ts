import type Phaser from 'phaser';

/**
 * Entity 공격 패턴 인터페이스
 * - LaserAttackPattern: Boss 레이저 공격
 */
export interface AttackPattern {
  readonly patternId: string;
  init(
    scene: Phaser.Scene,
    entityId: string,
    getPosition: () => { x: number; y: number }
  ): void;
  update(delta: number, gameTime: number): void;
  canFire(gameTime: number): boolean;
  fire(targetX: number, targetY: number): void;
  cancel(): void;
  destroy(): void;
}
