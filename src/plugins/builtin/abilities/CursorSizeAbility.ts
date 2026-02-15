import type { AbilityPlugin, AbilityContext, AbilityRenderer, DerivedStatEntry } from '../../types';
import type { CursorSizeLevelData } from '../../../data/types';
import { CURSOR_HITBOX } from '../../../data/constants';

export class CursorSizeAbility implements AbilityPlugin {
  readonly id = 'cursor_size';
  private ctx!: AbilityContext;

  init(ctx: AbilityContext): void {
    this.ctx = ctx;
  }

  update(): void {
    // 패시브 어빌리티 - update 불필요
  }

  clear(): void {}
  destroy(): void {}

  createRenderer(): AbilityRenderer | null {
    return null;
  }

  getEffectValue(key: string): number {
    const data = this.ctx.abilityData.getLevelData<CursorSizeLevelData>(this.id);
    if (!data) return 0;

    switch (key) {
      case 'sizeBonus':
        return data.sizeBonus;
      case 'damage':
        return data.damage;
      case 'missileThicknessBonus':
        return data.missileThicknessBonus;
      default:
        throw new Error(`Unknown effect key "${key}" for ability "${this.id}"`);
    }
  }

  getDerivedStats(currentLevel: number, nextLevel: number): DerivedStatEntry[] {
    const baseRadius = CURSOR_HITBOX.BASE_RADIUS;
    const getCursorSizeData = (level: number): CursorSizeLevelData | null => {
      if (level <= 0) return null;
      const upgradeData = this.ctx.abilityData.getSystemUpgrade(this.id);
      if (!upgradeData?.levels) return null;
      const index = Math.min(level, upgradeData.levels.length) - 1;
      return upgradeData.levels[index] as CursorSizeLevelData;
    };

    const currentData = getCursorSizeData(currentLevel);
    const nextData = getCursorSizeData(nextLevel);

    const currentRadiusPx = baseRadius * (1 + (currentData?.sizeBonus ?? 0));
    const nextRadiusPx = baseRadius * (1 + (nextData?.sizeBonus ?? 0));

    return [
      {
        id: 'cursorRadiusPx',
        label: 'Cursor Radius',
        currentValue: currentRadiusPx,
        nextValue: nextRadiusPx,
      },
    ];
  }
}
