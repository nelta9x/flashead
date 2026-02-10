import { describe, it, expect } from 'vitest';
import type { CursorSmoothingConfig } from '../src/data/types';
import { computeCursorSmoothing } from '../src/utils/cursorSmoothing';

const DEFAULT_CONFIG: CursorSmoothingConfig = {
  baseLerp: 0.4,
  snapThreshold: 175,
  convergenceThreshold: 0.5,
  deadZone: 2.5,
};

const FRAME_16 = 16.67; // ~60fps

describe('computeCursorSmoothing', () => {
  it('거리=0 → snap to target', () => {
    const result = computeCursorSmoothing(100, 100, 100, 100, FRAME_16, DEFAULT_CONFIG);
    expect(result.x).toBe(100);
    expect(result.y).toBe(100);
    expect(result.snapped).toBe(true);
  });

  it('거리=snapThreshold → factor=1.0 (즉시 추적)', () => {
    // distance = 175 (exactly snapThreshold)
    const result = computeCursorSmoothing(0, 0, 175, 0, FRAME_16, DEFAULT_CONFIG);
    // rawFactor = 0.4 + 0.6 * 1.0 = 1.0
    // smoothFactor = 1 - (1-1)^1 = 1.0
    expect(result.x).toBeCloseTo(175, 1);
    expect(result.y).toBeCloseTo(0, 1);
    expect(result.snapped).toBe(false);
  });

  it('거리 > snapThreshold → factor clamped at 1.0', () => {
    // distance = 500 >> snapThreshold=175
    const result = computeCursorSmoothing(0, 0, 500, 0, FRAME_16, DEFAULT_CONFIG);
    // rawFactor = 0.4 + 0.6 * clamp(500/175, 0, 1) = 0.4 + 0.6 * 1 = 1.0
    expect(result.x).toBeCloseTo(500, 1);
    expect(result.y).toBeCloseTo(0, 1);
  });

  it('중간 거리에서 부분적 스무딩 적용', () => {
    // distance = 50 < snapThreshold=175
    const result = computeCursorSmoothing(0, 0, 50, 0, FRAME_16, DEFAULT_CONFIG);
    // rawFactor = 0.4 + 0.6 * (50/175) ≈ 0.4 + 0.171 = 0.571
    // at 16.67ms frame, smoothFactor ≈ rawFactor
    expect(result.x).toBeGreaterThan(0);
    expect(result.x).toBeLessThan(50);
    expect(result.snapped).toBe(false);
  });

  it('convergenceThreshold 이하 → 즉시 snap', () => {
    // distance = 0.3 < convergenceThreshold=0.5
    const result = computeCursorSmoothing(100, 100, 100.3, 100, FRAME_16, DEFAULT_CONFIG);
    expect(result.x).toBe(100.3);
    expect(result.y).toBe(100);
    expect(result.snapped).toBe(true);
  });

  it('deadZone 이내 → snap to target (not stuck)', () => {
    // distance = 2.0 (> convergenceThreshold=0.5, < deadZone=2.5)
    // 수정 전: 이 영역에서 skip되어 커서가 영구 정지하는 버그가 있었음
    const result = computeCursorSmoothing(100, 100, 102, 100, FRAME_16, DEFAULT_CONFIG);
    expect(result.x).toBe(102);
    expect(result.y).toBe(100);
    expect(result.snapped).toBe(true);
  });

  it('프레임 독립 보정: delta=16.67ms vs 33.33ms', () => {
    const distance = 80; // 중간 거리
    const result16 = computeCursorSmoothing(0, 0, distance, 0, 16.67, DEFAULT_CONFIG);
    const result33 = computeCursorSmoothing(0, 0, distance, 0, 33.33, DEFAULT_CONFIG);

    // 33ms 프레임에서 더 많이 이동해야 함
    expect(result33.x).toBeGreaterThan(result16.x);

    // 두 프레임의 16.67ms 결과를 연속 적용한 것과 33.33ms 한 번이 유사해야 함
    const step1 = computeCursorSmoothing(0, 0, distance, 0, 16.67, DEFAULT_CONFIG);
    const step2 = computeCursorSmoothing(step1.x, 0, distance, 0, 16.67, DEFAULT_CONFIG);
    // 두 번의 16ms ≈ 한 번의 33ms (지수 보정은 근사치이므로 여유 있는 오차 허용)
    expect(Math.abs(step2.x - result33.x)).toBeLessThan(6);
  });

  it('2D 대각선 이동에서도 올바르게 동작', () => {
    const result = computeCursorSmoothing(0, 0, 100, 100, FRAME_16, DEFAULT_CONFIG);
    // distance = ~141.4
    // 대각선이므로 x, y 모두 이동
    expect(result.x).toBeGreaterThan(0);
    expect(result.y).toBeGreaterThan(0);
    // x와 y 이동량이 같아야 함 (45도)
    expect(result.x).toBeCloseTo(result.y, 5);
  });

  it('baseLerp 값에 따라 스무딩 강도 변화', () => {
    const softConfig: CursorSmoothingConfig = { ...DEFAULT_CONFIG, baseLerp: 0.2 };
    const hardConfig: CursorSmoothingConfig = { ...DEFAULT_CONFIG, baseLerp: 0.8 };
    const distance = 50;

    const softResult = computeCursorSmoothing(0, 0, distance, 0, FRAME_16, softConfig);
    const hardResult = computeCursorSmoothing(0, 0, distance, 0, FRAME_16, hardConfig);

    // 높은 baseLerp → 더 빠르게 목표에 도달
    expect(hardResult.x).toBeGreaterThan(softResult.x);
  });

  it('연속 프레임 수렴 테스트: 100프레임 후 목표 도달', () => {
    let cx = 0;
    let cy = 0;
    const tx = 200;
    const ty = 150;

    for (let i = 0; i < 100; i++) {
      const result = computeCursorSmoothing(cx, cy, tx, ty, FRAME_16, DEFAULT_CONFIG);
      cx = result.x;
      cy = result.y;
    }

    // 100프레임(~1.67초) 후 목표 지점에 충분히 수렴해야 함
    expect(cx).toBeCloseTo(tx, 1);
    expect(cy).toBeCloseTo(ty, 1);
  });

  it('delta=0 → 현재 위치 유지', () => {
    const result = computeCursorSmoothing(50, 50, 200, 200, 0, DEFAULT_CONFIG);
    expect(result.x).toBe(50);
    expect(result.y).toBe(50);
    expect(result.snapped).toBe(false);
  });

  it('delta=5000ms (탭 전환 후 복귀) → 안전하게 보간', () => {
    // 매우 큰 delta에서도 NaN/Infinity 없이 정상 동작
    const result = computeCursorSmoothing(0, 0, 100, 0, 5000, DEFAULT_CONFIG);
    expect(Number.isFinite(result.x)).toBe(true);
    expect(Number.isFinite(result.y)).toBe(true);
    // 5초 프레임이면 사실상 목표에 도달
    expect(result.x).toBeCloseTo(100, 1);
  });
});
