import type { AbilityPlugin, AbilityContext, AbilityRenderer } from '../../types';
import type { BlackHoleLevelData } from '../../../data/types';

export class BlackHoleAbility implements AbilityPlugin {
  readonly id = 'black_hole';
  private ctx!: AbilityContext;

  init(ctx: AbilityContext): void {
    this.ctx = ctx;
  }

  update(): void {
    // BlackHoleSystem의 스폰/풀/데미지 로직은 Phase 4에서 EntityManager 통합 시 이 플러그인으로 이전됨.
    // 현재는 BlackHoleSystem이 직접 담당.
  }

  clear(): void {}
  destroy(): void {}

  createRenderer(): AbilityRenderer | null {
    // BlackHoleRenderer는 Phase 4에서 이 플러그인으로 이전됨.
    return null;
  }

  getEffectValue(key: string): number {
    const data = this.ctx.upgradeSystem.getLevelData<BlackHoleLevelData>(this.id);
    if (!data) return 0;

    switch (key) {
      case 'damage':
        return data.damage;
      case 'radius':
        return data.radius;
      case 'force':
        return data.force;
      case 'duration':
        return data.duration;
      case 'spawnInterval':
        return data.spawnInterval;
      case 'spawnCount':
        return data.spawnCount;
      case 'damageInterval':
        return data.damageInterval;
      default:
        return 0;
    }
  }
}
