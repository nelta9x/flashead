import { describe, it, expect, vi } from 'vitest';
import { EntitySystemPipeline } from '../src/systems/EntitySystemPipeline';
import type { EntitySystem } from '../src/systems/entity-systems/EntitySystem';

function createMockSystem(id: string, enabled = true): EntitySystem {
  return {
    id,
    enabled,
    tick: vi.fn(),
  };
}

describe('EntitySystemPipeline', () => {
  describe('config 순서 실행', () => {
    it('config 순서대로 시스템을 실행해야 함', () => {
      const order: string[] = [];
      const pipeline = new EntitySystemPipeline(['a', 'b', 'c']);

      const sysA: EntitySystem = { id: 'a', enabled: true, tick: vi.fn(() => order.push('a')) };
      const sysB: EntitySystem = { id: 'b', enabled: true, tick: vi.fn(() => order.push('b')) };
      const sysC: EntitySystem = { id: 'c', enabled: true, tick: vi.fn(() => order.push('c')) };

      // 역순으로 등록해도 config 순서를 따라야 함
      pipeline.register(sysC);
      pipeline.register(sysA);
      pipeline.register(sysB);

      pipeline.run(16);

      expect(order).toEqual(['a', 'b', 'c']);
    });

    it('delta를 각 시스템에 전달해야 함', () => {
      const pipeline = new EntitySystemPipeline(['sys1']);
      const sys = createMockSystem('sys1');
      pipeline.register(sys);

      pipeline.run(33);

      expect(sys.tick).toHaveBeenCalledWith(33);
    });
  });

  describe('미등록 ID 건너뜀', () => {
    it('config에 있지만 미등록인 ID는 건너뛰어야 함', () => {
      const pipeline = new EntitySystemPipeline(['a', 'missing', 'b']);
      const sysA = createMockSystem('a');
      const sysB = createMockSystem('b');
      pipeline.register(sysA);
      pipeline.register(sysB);

      pipeline.run(16);

      expect(sysA.tick).toHaveBeenCalledOnce();
      expect(sysB.tick).toHaveBeenCalledOnce();
    });
  });

  describe('config 밖 시스템 끝 추가', () => {
    it('config에 없는 시스템은 끝에 추가되어야 함', () => {
      const order: string[] = [];
      const pipeline = new EntitySystemPipeline(['a']);

      const sysA: EntitySystem = { id: 'a', enabled: true, tick: vi.fn(() => order.push('a')) };
      const sysExtra: EntitySystem = { id: 'extra', enabled: true, tick: vi.fn(() => order.push('extra')) };

      pipeline.register(sysA);
      pipeline.register(sysExtra);

      pipeline.run(16);

      expect(order).toEqual(['a', 'extra']);
    });
  });

  describe('setEnabled', () => {
    it('비활성화된 시스템은 실행하지 않아야 함', () => {
      const pipeline = new EntitySystemPipeline(['a', 'b']);
      const sysA = createMockSystem('a');
      const sysB = createMockSystem('b');
      pipeline.register(sysA);
      pipeline.register(sysB);

      pipeline.setEnabled('a', false);
      pipeline.run(16);

      expect(sysA.tick).not.toHaveBeenCalled();
      expect(sysB.tick).toHaveBeenCalledOnce();
    });

    it('다시 활성화하면 실행되어야 함', () => {
      const pipeline = new EntitySystemPipeline(['a']);
      const sysA = createMockSystem('a');
      pipeline.register(sysA);

      pipeline.setEnabled('a', false);
      pipeline.run(16);
      expect(sysA.tick).not.toHaveBeenCalled();

      pipeline.setEnabled('a', true);
      pipeline.run(16);
      expect(sysA.tick).toHaveBeenCalledOnce();
    });

    it('미등록 ID에 대해 setEnabled는 조용히 무시해야 함', () => {
      const pipeline = new EntitySystemPipeline([]);
      expect(() => pipeline.setEnabled('nonexistent', false)).not.toThrow();
    });
  });

  describe('unregister', () => {
    it('등록 해제된 시스템은 실행하지 않아야 함', () => {
      const pipeline = new EntitySystemPipeline(['a', 'b']);
      const sysA = createMockSystem('a');
      const sysB = createMockSystem('b');
      pipeline.register(sysA);
      pipeline.register(sysB);

      pipeline.unregister('a');
      pipeline.run(16);

      expect(sysA.tick).not.toHaveBeenCalled();
      expect(sysB.tick).toHaveBeenCalledOnce();
    });
  });

  describe('중복 ID 교체', () => {
    it('같은 ID로 재등록하면 이전 시스템을 교체해야 함', () => {
      const pipeline = new EntitySystemPipeline(['a']);
      const sysOld = createMockSystem('a');
      const sysNew = createMockSystem('a');

      pipeline.register(sysOld);
      pipeline.register(sysNew);
      pipeline.run(16);

      expect(sysOld.tick).not.toHaveBeenCalled();
      expect(sysNew.tick).toHaveBeenCalledOnce();
    });
  });

  describe('getMissingSystems', () => {
    it('config에 있지만 미등록인 시스템 ID를 반환해야 함', () => {
      const pipeline = new EntitySystemPipeline(['a', 'b', 'c']);
      pipeline.register(createMockSystem('a'));

      expect(pipeline.getMissingSystems()).toEqual(['b', 'c']);
    });

    it('모두 등록되면 빈 배열을 반환해야 함', () => {
      const pipeline = new EntitySystemPipeline(['a']);
      pipeline.register(createMockSystem('a'));

      expect(pipeline.getMissingSystems()).toEqual([]);
    });
  });

  describe('getUnmappedSystems', () => {
    it('등록되었지만 config에 없는 시스템 ID를 반환해야 함', () => {
      const pipeline = new EntitySystemPipeline(['a']);
      pipeline.register(createMockSystem('a'));
      pipeline.register(createMockSystem('extra'));

      expect(pipeline.getUnmappedSystems()).toEqual(['extra']);
    });

    it('모두 config에 있으면 빈 배열을 반환해야 함', () => {
      const pipeline = new EntitySystemPipeline(['a', 'b']);
      pipeline.register(createMockSystem('a'));
      pipeline.register(createMockSystem('b'));

      expect(pipeline.getUnmappedSystems()).toEqual([]);
    });
  });

  describe('assertConfigSyncOrThrow', () => {
    it('config와 등록 상태가 일치하면 예외를 던지지 않아야 함', () => {
      const pipeline = new EntitySystemPipeline(['a', 'b']);
      pipeline.register(createMockSystem('a'));
      pipeline.register(createMockSystem('b'));

      expect(() => pipeline.assertConfigSyncOrThrow()).not.toThrow();
    });

    it('missing 시스템이 있으면 상세 정보와 함께 예외를 던져야 함', () => {
      const pipeline = new EntitySystemPipeline(['a', 'b']);
      pipeline.register(createMockSystem('a'));

      expect(() => pipeline.assertConfigSyncOrThrow()).toThrow('missing=["b"]');
    });

    it('unmapped 시스템이 있으면 상세 정보와 함께 예외를 던져야 함', () => {
      const pipeline = new EntitySystemPipeline(['a']);
      pipeline.register(createMockSystem('a'));
      pipeline.register(createMockSystem('extra'));

      expect(() => pipeline.assertConfigSyncOrThrow()).toThrow('unmapped=["extra"]');
    });
  });

  describe('clear', () => {
    it('모든 시스템을 제거해야 함', () => {
      const pipeline = new EntitySystemPipeline(['a']);
      const sys = createMockSystem('a');
      pipeline.register(sys);

      pipeline.clear();
      pipeline.run(16);

      expect(sys.tick).not.toHaveBeenCalled();
    });

    it('clear 후 getMissingSystems는 config 전체를 반환해야 함', () => {
      const pipeline = new EntitySystemPipeline(['a', 'b']);
      pipeline.register(createMockSystem('a'));
      pipeline.register(createMockSystem('b'));

      pipeline.clear();
      expect(pipeline.getMissingSystems()).toEqual(['a', 'b']);
    });
  });

  describe('빈 config', () => {
    it('빈 config에서도 등록된 시스템을 실행해야 함', () => {
      const pipeline = new EntitySystemPipeline([]);
      const sys = createMockSystem('custom');
      pipeline.register(sys);

      pipeline.run(16);

      expect(sys.tick).toHaveBeenCalledOnce();
    });
  });

  describe('lazy rebuild', () => {
    it('register 후 run 시 정렬이 반영되어야 함', () => {
      const order: string[] = [];
      const pipeline = new EntitySystemPipeline(['a', 'b']);

      const sysA: EntitySystem = { id: 'a', enabled: true, tick: vi.fn(() => order.push('a')) };
      pipeline.register(sysA);
      pipeline.run(16);
      expect(order).toEqual(['a']);

      const sysB: EntitySystem = { id: 'b', enabled: true, tick: vi.fn(() => order.push('b')) };
      pipeline.register(sysB);
      pipeline.run(16);
      expect(order).toEqual(['a', 'a', 'b']);
    });
  });
});
