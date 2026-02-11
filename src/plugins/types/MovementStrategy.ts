/**
 * Entity 이동 전략 인터페이스
 * - DriftMovement: Boss 스타일 사인파 드리프트
 * - 없을 경우(null): Dish 스타일 정지+흔들림 (기본)
 */
export interface MovementStrategy {
  init(homeX: number, homeY: number): void;
  update(delta: number, frozen: boolean, stunned: boolean): { x: number; y: number };
  destroy(): void;
}
