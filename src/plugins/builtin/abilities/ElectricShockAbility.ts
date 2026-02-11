import type { AbilityPlugin, AbilityContext, AbilityRenderer } from '../../types';
import type { ElectricShockLevelData } from '../../../data/types';

export class ElectricShockAbility implements AbilityPlugin {
  readonly id = 'electric_shock';
  private ctx!: AbilityContext;

  init(ctx: AbilityContext): void {
    this.ctx = ctx;
  }

  update(): void {
    // 전기 충격 로직은 Phase 4에서 EntityManager 통합 시 이 플러그인으로 이전됨.
    // 현재는 DishResolutionService가 담당.
  }

  clear(): void {}
  destroy(): void {}

  createRenderer(): AbilityRenderer | null {
    return null;
  }

  getEffectValue(key: string): number {
    const data = this.ctx.upgradeSystem.getLevelData<ElectricShockLevelData>(this.id);
    if (!data) return 0;

    switch (key) {
      case 'radius':
        return data.radius;
      case 'damage':
        return data.damage;
      default:
        return 0;
    }
  }
}
