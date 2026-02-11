import type { AbilityPlugin, AbilityContext, AbilityRenderer } from '../../types';
import type { MagnetLevelData } from '../../../data/types';

export class MagnetAbility implements AbilityPlugin {
  readonly id = 'magnet';
  private ctx!: AbilityContext;

  init(ctx: AbilityContext): void {
    this.ctx = ctx;
  }

  update(): void {
    // 자기장 풀/이동 로직은 Phase 4에서 EntityManager 통합 시 이 플러그인으로 이전됨.
    // 현재는 DishFieldEffectService가 담당.
  }

  clear(): void {}
  destroy(): void {}

  createRenderer(): AbilityRenderer | null {
    return null;
  }

  getEffectValue(key: string): number {
    const data = this.ctx.upgradeSystem.getLevelData<MagnetLevelData>(this.id);
    if (!data) return 0;

    switch (key) {
      case 'radius':
        return data.radius;
      case 'force':
        return data.force;
      default:
        return 0;
    }
  }
}
