import type Phaser from 'phaser';
import type {
  EntityTypePlugin,
  EntityTypeConfig,
  EntityTypeRenderer,
} from '../../types';

/**
 * 폭탄 엔티티 타입 플러그인.
 * 커서 접촉 시 즉시 폭발 (explode 상호작용).
 * 'bomb' 아키타입을 사용하여 접시와 분리된 컴포넌트 구성을 갖는다.
 */
export class BombEntityPlugin implements EntityTypePlugin {
  readonly typeId = 'bomb';
  readonly config: EntityTypeConfig = {
    spawnCategory: 'pooled',
    poolSize: 10,
    defaultLifetime: 2800,
    isGatekeeper: false,
    cursorInteraction: 'explode',
    archetypeId: 'bomb',
  };

  createRenderer(
    _scene: Phaser.Scene,
    _host: Phaser.GameObjects.Container
  ): EntityTypeRenderer {
    return {
      render: () => {
        // EntityRenderSystem에서 bombProps 기반으로 DishRenderer.renderDangerDish() 호출
      },
      destroy: () => {},
    };
  }
}
