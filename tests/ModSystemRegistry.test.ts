import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ModSystemRegistry,
  type ModSystemContext,
  type ModSystemSharedContext,
} from '../src/plugins/ModSystemRegistry';
import type { ScopedEventBus } from '../src/plugins/types/ModTypes';

function createMockSharedContext(): ModSystemSharedContext {
  return {
    entities: {
      getActiveEntities: vi.fn(() => []),
      forEachActive: vi.fn(),
      getEntitiesInRadius: vi.fn(() => []),
      getEntitiesWithCondition: vi.fn(() => []),
    } as unknown as ModSystemSharedContext['entities'],
    statusEffectManager: { clear: vi.fn() } as unknown as ModSystemSharedContext['statusEffectManager'],
  };
}

function createMockScopedEventBus(): ScopedEventBus {
  return {
    on: vi.fn(),
    once: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
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
      registry.bindSystemEventBus('sys', createMockScopedEventBus());

      const context = createMockSharedContext();
      registry.runAll(16, context);

      expect(fn1).not.toHaveBeenCalled();
      expect(fn2).toHaveBeenCalled();
      expect(registry.getSystemIds()).toEqual(['sys']);
    });
  });

  describe('bindSystemEventBus', () => {
    it('미등록 systemId 바인딩 시 예외를 던져야 함', () => {
      expect(() =>
        registry.bindSystemEventBus('missing', createMockScopedEventBus())
      ).toThrow('Unknown system id');
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
      registry.bindSystemEventBus('sys1', createMockScopedEventBus());
      registry.bindSystemEventBus('sys2', createMockScopedEventBus());

      const context = createMockSharedContext();
      registry.runAll(16, context);

      expect(fn1).toHaveBeenCalledWith(
        16,
        expect.objectContaining({ entities: context.entities, statusEffectManager: context.statusEffectManager })
      );
      expect(fn2).toHaveBeenCalledWith(
        16,
        expect.objectContaining({ entities: context.entities, statusEffectManager: context.statusEffectManager })
      );
    });

    it('우선순위 순서로 실행되어야 함 (낮은 값 먼저)', () => {
      const order: string[] = [];
      registry.registerSystem('low', () => order.push('low'), 10);
      registry.registerSystem('high', () => order.push('high'), 0);
      registry.registerSystem('mid', () => order.push('mid'), 5);
      registry.bindSystemEventBus('low', createMockScopedEventBus());
      registry.bindSystemEventBus('high', createMockScopedEventBus());
      registry.bindSystemEventBus('mid', createMockScopedEventBus());

      registry.runAll(16, createMockSharedContext());

      expect(order).toEqual(['high', 'mid', 'low']);
    });

    it('기본 우선순위는 0이어야 함', () => {
      const order: string[] = [];
      registry.registerSystem('default', () => order.push('default'));
      registry.registerSystem('explicit-0', () => order.push('explicit-0'), 0);
      registry.registerSystem('positive', () => order.push('positive'), 1);
      registry.bindSystemEventBus('default', createMockScopedEventBus());
      registry.bindSystemEventBus('explicit-0', createMockScopedEventBus());
      registry.bindSystemEventBus('positive', createMockScopedEventBus());

      registry.runAll(16, createMockSharedContext());

      // default(0)과 explicit-0(0)은 등록 순서, positive(1)은 마지막
      expect(order[2]).toBe('positive');
    });

    it('시스템이 없을 때 호출해도 안전해야 함', () => {
      expect(() => registry.runAll(16, createMockSharedContext())).not.toThrow();
    });

    it('미바인딩 시스템이 있으면 즉시 예외를 던져야 함', () => {
      registry.registerSystem('sys1', vi.fn());

      expect(() => registry.runAll(16, createMockSharedContext())).toThrow(
        'missing scoped event bus binding'
      );
    });

    it('시스템은 바인딩된 scoped event bus를 context.eventBus로 받아야 함', () => {
      const tickFn = vi.fn();
      const scopedBus = createMockScopedEventBus();

      registry.registerSystem('sys', tickFn);
      registry.bindSystemEventBus('sys', scopedBus);
      const sharedContext = createMockSharedContext();

      registry.runAll(16, sharedContext);

      const received = tickFn.mock.calls.at(0)?.[1] as ModSystemContext | undefined;
      expect(received).toBeDefined();
      if (!received) {
        throw new Error('expected context argument');
      }
      expect(received.eventBus).toBe(scopedBus);
      expect(received.entities).toBe(sharedContext.entities);
      expect(received.statusEffectManager).toBe(sharedContext.statusEffectManager);
    });
  });

  describe('clear', () => {
    it('모든 시스템을 제거해야 함', () => {
      registry.registerSystem('sys1', vi.fn());
      registry.registerSystem('sys2', vi.fn());
      registry.bindSystemEventBus('sys1', createMockScopedEventBus());
      registry.bindSystemEventBus('sys2', createMockScopedEventBus());

      registry.clear();

      expect(registry.getSystemIds()).toEqual([]);
      expect(() => registry.runAll(16, createMockSharedContext())).not.toThrow();
    });
  });
});
