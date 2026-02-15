import type Phaser from 'phaser';
import type { SystemUpgradeData } from '../../data/types';
import type { CursorSnapshot } from '../../scenes/game/GameSceneContracts';

/** 어빌리티 렌더러 인터페이스 */
export interface AbilityRenderer {
  update(delta: number): void;
  render(): void;
  destroy(): void;
}

/** Ability 진행 상태(레벨/스택) 조회 인터페이스 */
export interface AbilityStateReader {
  getAbilityLevel(abilityId: string): number;
  getAllAbilityLevels(): Map<string, number>;
}

/** Ability 데이터(업그레이드/레벨 데이터) 조회 인터페이스 */
export interface AbilityDataReader {
  getLevelData<T>(abilityId: string): T | null;
  getSystemUpgrade(abilityId: string): SystemUpgradeData;
}

/** 어빌리티 플러그인에 제공되는 컨텍스트 */
export interface AbilityContext {
  scene: Phaser.Scene;
  abilityState: AbilityStateReader;
  abilityData: AbilityDataReader;
  getCursor: () => CursorSnapshot;
}

/** 업그레이드 프리뷰의 파생 스탯 항목 */
export interface DerivedStatEntry {
  id: string;
  label: string;
  currentValue: number;
  nextValue: number;
}

/**
 * 어빌리티 플러그인 인터페이스
 * 패시브/액티브 어빌리티를 플러그인으로 구현한다.
 */
export interface AbilityPlugin {
  readonly id: string;

  init(ctx: AbilityContext): void;
  update(delta: number, gameTime: number, playerX: number, playerY: number): void;
  clear(): void;
  destroy(): void;

  createRenderer(scene: Phaser.Scene): AbilityRenderer | null;
  getEffectValue(key: string): number;
  getDerivedStats?(currentLevel: number, nextLevel: number): DerivedStatEntry[];
}
