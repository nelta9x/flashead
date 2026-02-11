/**
 * 공통 엔티티 타입 정의
 * Dish.ts와 Entity.ts 모두에서 사용하는 공유 인터페이스
 */

export interface DishUpgradeOptions {
  damageBonus?: number;
  attackSpeedMultiplier?: number;
  criticalChance?: number;
  globalSlowPercent?: number;
  cursorSizeBonus?: number;
}
