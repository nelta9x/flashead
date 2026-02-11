import type { AbilityPlugin, AbilityContext, AbilityRenderer } from '../../types';
import type { CriticalChanceLevelData } from '../../../data/types';

export class CriticalChanceAbility implements AbilityPlugin {
  readonly id = 'critical_chance';
  private ctx!: AbilityContext;

  init(ctx: AbilityContext): void {
    this.ctx = ctx;
  }

  update(): void {}
  clear(): void {}
  destroy(): void {}

  createRenderer(): AbilityRenderer | null {
    return null;
  }

  getEffectValue(key: string): number {
    const data = this.ctx.upgradeSystem.getLevelData<CriticalChanceLevelData>(this.id);
    if (!data) return 0;

    switch (key) {
      case 'criticalChance':
        return data.criticalChance;
      default:
        return 0;
    }
  }
}
