import type { AbilityPlugin, AbilityContext, AbilityRenderer } from '../../types';
import type { MissileLevelData } from '../../../data/types';

export class MissileAbility implements AbilityPlugin {
  readonly id = 'missile';
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
    const data = this.ctx.upgradeSystem.getLevelData<MissileLevelData>(this.id);
    if (!data) return 0;

    switch (key) {
      case 'damage':
        return data.damage;
      case 'count':
        return data.count;
      default:
        return 0;
    }
  }
}
