import { RARITY_WEIGHTS_BY_COUNT } from '../config/constants';

export interface Upgrade {
  id: string;
  name: string;
  description: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  maxStack: number;
  effect: (upgradeSystem: UpgradeSystem, stack: number) => void;
}

const UPGRADES: Upgrade[] = [
  {
    id: 'cursor_size',
    name: '넓은 타격',
    description: '커서 판정 범위가 3% 증가합니다. (기본 크기 기준)',
    rarity: 'rare',
    maxStack: Infinity,
    effect: (us) => us.addCursorSizeBonus(0.03),
  },
  {
    id: 'electric_shock',
    name: '전기 충격',
    description: '주변 접시에 번개 데미지를 줍니다.',
    rarity: 'rare',
    maxStack: 2,
    effect: (us) => us.addElectricShockLevel(1),
  },
  {
    id: 'magnet',
    name: '자기장',
    description: '커서 주변 접시가 끌려옵니다',
    rarity: 'rare',
    maxStack: 3,
    effect: (us) => us.addMagnetLevel(1),
  },
];

export class UpgradeSystem {
  private upgradeStacks: Map<string, number> = new Map();

  // 커서 크기
  private cursorSizeBonus: number = 0;

  // 전기 충격
  private electricShockLevel: number = 0;

  // 자기장
  private magnetLevel: number = 0;

  constructor() {
    this.reset();
  }

  reset(): void {
    this.upgradeStacks.clear();

    // 커서 크기
    this.cursorSizeBonus = 0;

    // 전기 충격
    this.electricShockLevel = 0;

    // 자기장
    this.magnetLevel = 0;
  }

  update(_delta: number, _gameTime: number): void {
    // 웨이브 기반 업그레이드 시스템으로 변경됨
    // 시간 기반 업그레이드 트리거 제거
  }

  getRandomUpgrades(count: number): Upgrade[] {
    // 동적 희귀도 가중치 (업그레이드 횟수에 따라 변화)
    const rarityWeights = this.getRarityWeights();

    // 사용 가능한 업그레이드 필터링 (최대 스택 미달성)
    const availableUpgrades = UPGRADES.filter((upgrade) => {
      const currentStack = this.upgradeStacks.get(upgrade.id) || 0;
      return currentStack < upgrade.maxStack;
    });

    if (availableUpgrades.length === 0) {
      return UPGRADES.slice(0, count); // 폴백
    }

    // 가중치 기반 선택
    const selected: Upgrade[] = [];
    const pool = [...availableUpgrades];

    while (selected.length < count && pool.length > 0) {
      const totalWeight = pool.reduce((sum, u) => sum + rarityWeights[u.rarity], 0);
      let random = Math.random() * totalWeight;

      for (let i = 0; i < pool.length; i++) {
        random -= rarityWeights[pool[i].rarity];
        if (random <= 0) {
          selected.push(pool[i]);
          pool.splice(i, 1);
          break;
        }
      }
    }

    return selected;
  }

  private getRarityWeights(): Record<string, number> {
    // 업그레이드 횟수에 따라 희귀도 가중치 변화
    const totalUpgrades = this.getTotalUpgradeCount();

    if (totalUpgrades <= 2) {
      return RARITY_WEIGHTS_BY_COUNT.early;
    } else if (totalUpgrades <= 4) {
      return RARITY_WEIGHTS_BY_COUNT.mid;
    } else if (totalUpgrades <= 6) {
      return RARITY_WEIGHTS_BY_COUNT.late;
    } else {
      return RARITY_WEIGHTS_BY_COUNT.endgame;
    }
  }

  private getTotalUpgradeCount(): number {
    let total = 0;
    this.upgradeStacks.forEach((stack) => {
      total += stack;
    });
    return total;
  }

  applyUpgrade(upgrade: Upgrade): void {
    const currentStack = this.upgradeStacks.get(upgrade.id) || 0;

    if (currentStack >= upgrade.maxStack) {
      return;
    }

    // 스택 증가
    this.upgradeStacks.set(upgrade.id, currentStack + 1);

    // 효과 적용
    upgrade.effect(this, currentStack + 1);
  }

  // ========== 커서 크기 ==========
  addCursorSizeBonus(amount: number): void {
    this.cursorSizeBonus += amount;
  }

  getCursorSizeBonus(): number {
    return this.cursorSizeBonus;
  }

  // ========== 전기 충격 ==========
  addElectricShockLevel(level: number): void {
    this.electricShockLevel += level;
  }

  getElectricShockLevel(): number {
    return this.electricShockLevel;
  }

  // ========== 자기장 ==========
  addMagnetLevel(level: number): void {
    this.magnetLevel += level;
  }

  getMagnetLevel(): number {
    return this.magnetLevel;
  }

  // ========== 유틸리티 ==========
  getUpgradeStack(upgradeId: string): number {
    return this.upgradeStacks.get(upgradeId) || 0;
  }

  getAllUpgradeStacks(): Map<string, number> {
    return new Map(this.upgradeStacks);
  }
}
