import type { AbilityPlugin, AbilityContext, AbilityRenderer, DerivedStatEntry } from '../../types';
import type { OrbitingOrbLevelData } from '../../../data/types';

export class OrbAbility implements AbilityPlugin {
  readonly id = 'orbiting_orb';
  private ctx!: AbilityContext;

  init(ctx: AbilityContext): void {
    this.ctx = ctx;
  }

  update(): void {
    // OrbSystem의 충돌/이동 로직은 Phase 4에서 EntityManager 통합 시 이 플러그인으로 이전됨.
    // 현재는 OrbSystem이 직접 담당.
  }

  clear(): void {}
  destroy(): void {}

  createRenderer(): AbilityRenderer | null {
    // OrbRenderer는 Phase 4에서 이 플러그인으로 이전됨.
    return null;
  }

  getEffectValue(key: string): number {
    const data = this.ctx.abilityData.getLevelData<OrbitingOrbLevelData>(this.id);
    if (!data) return 0;

    switch (key) {
      case 'count':
        return data.count;
      case 'damage':
        return data.damage;
      case 'speed':
        return data.speed;
      case 'radius':
        return data.radius;
      case 'size':
        return data.size;
      default:
        throw new Error(`Unknown effect key "${key}" for ability "${this.id}"`);
    }
  }

  getDerivedStats(currentLevel: number, nextLevel: number): DerivedStatEntry[] {
    const magnetLevel = this.ctx.abilityState.getAbilityLevel('magnet');

    const getOrbData = (level: number): OrbitingOrbLevelData | null => {
      if (level <= 0) return null;
      const upgradeData = this.ctx.abilityData.getSystemUpgrade(this.id);
      if (!upgradeData?.levels) return null;
      const index = Math.min(level, upgradeData.levels.length) - 1;
      return upgradeData.levels[index] as OrbitingOrbLevelData;
    };

    const currentData = getOrbData(currentLevel);
    const nextData = getOrbData(nextLevel);

    const upgradeData = this.ctx.abilityData.getSystemUpgrade(this.id);
    const magnetSynergyPerLevel = upgradeData?.magnetSynergyPerLevel ?? 0.2;
    const synergy = 1 + magnetLevel * magnetSynergyPerLevel;
    const currentFinalSize = (currentData?.size ?? 0) * synergy;
    const nextFinalSize = (nextData?.size ?? 0) * synergy;

    return [
      {
        id: 'orbFinalSizeWithMagnet',
        label: 'Orb Size (w/ Magnet)',
        currentValue: currentFinalSize,
        nextValue: nextFinalSize,
      },
    ];
  }
}
