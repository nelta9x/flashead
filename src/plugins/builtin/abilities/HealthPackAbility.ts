import type { AbilityPlugin, AbilityContext, AbilityRenderer } from '../../types';
import type { HealthPackLevelData } from '../../../data/types';

export class HealthPackAbility implements AbilityPlugin {
  readonly id = 'health_pack';
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
    const data = this.ctx.abilityData.getLevelData<HealthPackLevelData>(this.id);
    if (!data) return 0;

    switch (key) {
      case 'hpBonus':
        return data.hpBonus;
      case 'dropChanceBonus':
        return data.dropChanceBonus;
      default:
        throw new Error(`Unknown effect key "${key}" for ability "${this.id}"`);
    }
  }
}
