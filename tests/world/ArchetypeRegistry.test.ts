import { describe, it, expect, beforeEach } from 'vitest';
import { ArchetypeRegistry, BUILTIN_ARCHETYPES, registerBuiltinArchetypes } from '../../src/world/archetypes';
import { defineComponent } from '../../src/world/ComponentDef';
import { C_Identity, C_Transform } from '../../src/world/components';

describe('ArchetypeRegistry', () => {
  let registry: ArchetypeRegistry;

  beforeEach(() => {
    registry = new ArchetypeRegistry();
  });

  describe('register / get', () => {
    it('아키타입을 등록하고 조회할 수 있어야 함', () => {
      const arch = { id: 'test', components: [C_Identity, C_Transform] };
      registry.register(arch);

      expect(registry.get('test')).toBe(arch);
    });

    it('중복 ID 등록 시 에러를 던져야 함', () => {
      const arch = { id: 'test', components: [C_Identity] };
      registry.register(arch);

      expect(() => registry.register(arch)).toThrow('already registered');
    });

    it('존재하지 않는 아키타입은 undefined 반환', () => {
      expect(registry.get('missing')).toBeUndefined();
    });
  });

  describe('getRequired', () => {
    it('존재하는 아키타입을 반환해야 함', () => {
      const arch = { id: 'test', components: [C_Identity] };
      registry.register(arch);
      expect(registry.getRequired('test')).toBe(arch);
    });

    it('없으면 에러를 던져야 함', () => {
      expect(() => registry.getRequired('missing')).toThrow('not found');
    });
  });

  describe('unregister', () => {
    it('등록된 아키타입을 해제할 수 있어야 함', () => {
      registry.register({ id: 'test', components: [C_Identity] });
      expect(registry.unregister('test')).toBe(true);
      expect(registry.get('test')).toBeUndefined();
    });

    it('없는 아키타입 해제 시 false 반환', () => {
      expect(registry.unregister('missing')).toBe(false);
    });
  });

  describe('has / getIds / getAll', () => {
    it('has가 존재 여부를 올바르게 반환해야 함', () => {
      registry.register({ id: 'a', components: [] });
      expect(registry.has('a')).toBe(true);
      expect(registry.has('b')).toBe(false);
    });

    it('getIds가 등록된 아키타입 ID 목록을 반환해야 함', () => {
      registry.register({ id: 'a', components: [] });
      registry.register({ id: 'b', components: [] });
      expect(registry.getIds().sort()).toEqual(['a', 'b']);
    });

    it('getAll이 ReadonlyMap을 반환해야 함', () => {
      registry.register({ id: 'a', components: [C_Identity] });
      const all = registry.getAll();
      expect(all.size).toBe(1);
      expect(all.get('a')?.id).toBe('a');
    });
  });

  describe('clear', () => {
    it('모든 아키타입을 제거해야 함', () => {
      registry.register({ id: 'a', components: [] });
      registry.register({ id: 'b', components: [] });
      registry.clear();
      expect(registry.getIds()).toEqual([]);
    });
  });
});

describe('BUILTIN_ARCHETYPES', () => {
  it('player, dish, bomb, boss, fallingBomb, healthPack 6개 아키타입이 정의되어야 함', () => {
    const ids = BUILTIN_ARCHETYPES.map(a => a.id);
    expect(ids).toContain('player');
    expect(ids).toContain('dish');
    expect(ids).toContain('bomb');
    expect(ids).toContain('boss');
    expect(ids).toContain('fallingBomb');
    expect(ids).toContain('healthPack');
    expect(BUILTIN_ARCHETYPES).toHaveLength(6);
  });

  it('boss 아키타입은 dish의 공유 컴포넌트를 모두 포함해야 함', () => {
    const dish = BUILTIN_ARCHETYPES.find(a => a.id === 'dish')!;
    const boss = BUILTIN_ARCHETYPES.find(a => a.id === 'boss')!;
    const bossNames = boss.components.map(c => c.name);
    // dishTag/bossTag는 타입별 태그이므로 제외
    const sharedDishComps = dish.components.filter(c => c.name !== 'dishTag');
    for (const comp of sharedDishComps) {
      expect(bossNames).toContain(comp.name);
    }
  });
});

describe('registerBuiltinArchetypes', () => {
  it('빌트인 아키타입을 레지스트리에 등록해야 함', () => {
    const registry = new ArchetypeRegistry();
    registerBuiltinArchetypes(registry);

    expect(registry.has('player')).toBe(true);
    expect(registry.has('dish')).toBe(true);
    expect(registry.has('boss')).toBe(true);
  });
});

describe('defineComponent', () => {
  it('ComponentDef 토큰을 생성해야 함', () => {
    interface CustomComp { value: number; }
    const def = defineComponent<CustomComp>('custom');
    expect(def.name).toBe('custom');
    expect(Object.isFrozen(def)).toBe(true);
  });
});
