import type Phaser from 'phaser';
import type {
  EntityTypePlugin,
  EntityTypeConfig,
  EntityTypeRenderer,
  MovementStrategy,
} from '../../types';
import { DriftMovement } from '../movement/DriftMovement';

interface BossMovementConfig {
  type: string;
  drift: {
    xAmplitude: number;
    xFrequency: number;
    yAmplitude: number;
    yFrequency: number;
  };
  bounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };
}

/**
 * 표준 보스 타입 플러그인.
 * 드리프트 이동, 아머 HP 바, 피격 반응(push/shake/flash), 레이저 공격.
 */
export class StandardBossPlugin implements EntityTypePlugin {
  readonly typeId = 'boss_standard';
  readonly config: EntityTypeConfig = {
    poolSize: 0,
    defaultLifetime: null,
    isGatekeeper: true,
    cursorInteraction: 'contact',
  };

  private readonly movementConfig: BossMovementConfig | null;

  constructor(movementConfig?: BossMovementConfig) {
    this.movementConfig = movementConfig ?? null;
  }

  createRenderer(
    _scene: Phaser.Scene,
    _host: Phaser.GameObjects.Container
  ): EntityTypeRenderer {
    // BossRenderer 인스턴스를 래핑
    // Phase 4 통합 시 기존 BossRenderer를 EntityTypeRenderer 어댑터로 교체
    return {
      render: () => {},
      destroy: () => {},
    };
  }

  createMovementStrategy(entityId: string): MovementStrategy | null {
    if (!this.movementConfig || this.movementConfig.type !== 'drift') {
      return null;
    }

    return new DriftMovement(
      this.movementConfig.drift,
      this.movementConfig.bounds,
      entityId
    );
  }

}
