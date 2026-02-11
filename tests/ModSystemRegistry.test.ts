import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ModSystemRegistry, ModSystemContext } from '../src/plugins/ModSystemRegistry';

function createMockContext(): ModSystemContext {
  return {
    entities: {
      getActiveEntities: vi.fn(() => []),
      forEachActive: vi.fn(),
      getEntitiesInRadius: vi.fn(() => []),
      getEntitiesWithCondition: vi.fn(() => []),
    } as unknown as ModSystemContext['entities'],
    statusEffectManager: { clear: vi.fn() } as unknown as ModSystemContext['statusEffectManager'],
    eventBus: { emit: vi.fn() } as unknown as ModSystemContext['eventBus'],
  };
}

describe('ModSystemRegistry', () => {
  let registry: ModSystemRegistry;

  beforeEach(() => {
    registry = new ModSystemRegistry();
  });

  describe('registerSystem / getSystemIds', () => {
    it('시스템을 등록하고 ID 목록을 조회할 수 있어야 함', () => {
      registry.registerSystem('test-system', vi.fn());

      expect(registry.getSystemIds()).toEqual(['test-system']);
    });

    it('중복 ID 등록 시 이전 시스템을 교체해야 함', () => {
      const fn1 = vi.fn();
      const fn2 = vi.fn();
      registry.registerSystem('sys', fn1);
      registry.registerSystem('sys', fn2);

      const context = createMockContext();
      registry.runAll(16, context);

      expect(fn1).not.toHaveBeenCalled();
      expect(fn2).toHaveBeenCalled();
      expect(registry.getSystemIds()).toEqual(['sys']);
    });
  });

  describe('unregisterSystem', () => {
    it('등록된 시스템을 제거할 수 있어야 함', () => {
      registry.registerSystem('sys', vi.fn());
      registry.unregisterSystem('sys');

      expect(registry.getSystemIds()).toEqual([]);
    });

    it('존재하지 않는 시스템 제거는 무해해야 함', () => {
      registry.unregisterSystem('nonexistent');
      expect(registry.getSystemIds()).toEqual([]);
    });
  });

  describe('runAll', () => {
    it('등록된 모든 시스템의 tickFn을 호출해야 함', () => {
      const fn1 = vi.fn();
      const fn2 = vi.fn();
      registry.registerSystem('sys1', fn1);
      registry.registerSystem('sys2', fn2);

      const context = createMockContext();
      registry.runAll(16, context);

      expect(fn1).toHaveBeenCalledWith(16, context);
      expect(fn2).toHaveBeenCalledWith(16, context);
    });

    it('우선순위 순서로 실행되어야 함 (낮은 값 먼저)', () => {
      const order: string[] = [];
      registry.registerSystem('low', () => order.push('low'), 10);
      registry.registerSystem('high', () => order.push('high'), 0);
      registry.registerSystem('mid', () => order.push('mid'), 5);

      registry.runAll(16, createMockContext());

      expect(order).toEqual(['high', 'mid', 'low']);
    });

    it('기본 우선순위는 0이어야 함', () => {
      const order: string[] = [];
      registry.registerSystem('default', () => order.push('default'));
      registry.registerSystem('explicit-0', () => order.push('explicit-0'), 0);
      registry.registerSystem('positive', () => order.push('positive'), 1);

      registry.runAll(16, createMockContext());

      // default(0)과 explicit-0(0)은 등록 순서, positive(1)은 마지막
      expect(order[2]).toBe('positive');
    });

    it('시스템이 없을 때 호출해도 안전해야 함', () => {
      expect(() => registry.runAll(16, createMockContext())).not.toThrow();
    });
  });

  describe('clear', () => {
    it('모든 시스템을 제거해야 함', () => {
      registry.registerSystem('sys1', vi.fn());
      registry.registerSystem('sys2', vi.fn());

      registry.clear();

      expect(registry.getSystemIds()).toEqual([]);
    });
  });
});
