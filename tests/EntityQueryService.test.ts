import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EntityQueryService } from '../src/systems/EntityQueryService';

interface MockEntity {
  active: boolean;
  x: number;
  y: number;
}

function createMockPool(entities: MockEntity[]) {
  const activeSet = new Set(entities.filter((e) => e.active));
  return {
    getActiveObjects: () => Array.from(activeSet),
    forEach: (cb: (e: MockEntity) => void) => {
      for (const e of activeSet) cb(e);
    },
  };
}

describe('EntityQueryService', () => {
  let service: EntityQueryService;
  let entities: MockEntity[];

  beforeEach(() => {
    entities = [
      { active: true, x: 100, y: 100 },
      { active: true, x: 200, y: 200 },
      { active: true, x: 300, y: 300 },
    ];
    const pool = createMockPool(entities);
    service = new EntityQueryService(pool as never);
  });

  describe('getActiveEntities', () => {
    it('활성 엔티티 목록을 반환해야 함', () => {
      const result = service.getActiveEntities();
      expect(result).toHaveLength(3);
    });

    it('빈 풀에서 빈 배열을 반환해야 함', () => {
      const emptyPool = createMockPool([]);
      const emptyService = new EntityQueryService(emptyPool as never);
      expect(emptyService.getActiveEntities()).toHaveLength(0);
    });
  });

  describe('forEachActive', () => {
    it('각 활성 엔티티에 대해 콜백을 호출해야 함', () => {
      const callback = vi.fn();
      service.forEachActive(callback);
      expect(callback).toHaveBeenCalledTimes(3);
    });
  });

  describe('getEntitiesInRadius', () => {
    it('반경 내의 엔티티를 반환해야 함', () => {
      const result = service.getEntitiesInRadius(100, 100, 50);
      expect(result).toHaveLength(1);
      expect(result[0]).toBe(entities[0]);
    });

    it('반경이 충분히 크면 모든 엔티티를 반환해야 함', () => {
      const result = service.getEntitiesInRadius(200, 200, 500);
      expect(result).toHaveLength(3);
    });

    it('반경 내에 엔티티가 없으면 빈 배열을 반환해야 함', () => {
      const result = service.getEntitiesInRadius(999, 999, 10);
      expect(result).toHaveLength(0);
    });

    it('경계값 - 정확히 반경 거리에 있는 엔티티를 포함해야 함', () => {
      // entity at (200,200), query at (200,100) → distance = 100
      const result = service.getEntitiesInRadius(200, 100, 100);
      expect(result.some((e) => e === entities[1])).toBe(true);
    });
  });

  describe('getEntitiesWithCondition', () => {
    it('조건을 만족하는 엔티티만 반환해야 함', () => {
      const result = service.getEntitiesWithCondition((e) => e.x > 150);
      expect(result).toHaveLength(2);
    });

    it('조건을 만족하는 엔티티가 없으면 빈 배열을 반환해야 함', () => {
      const result = service.getEntitiesWithCondition((e) => e.x > 999);
      expect(result).toHaveLength(0);
    });

    it('모든 엔티티가 조건을 만족하면 모두 반환해야 함', () => {
      const result = service.getEntitiesWithCondition(() => true);
      expect(result).toHaveLength(3);
    });
  });

  describe('setBossProvider', () => {
    const boss1: MockEntity = { active: true, x: 500, y: 500 };
    const boss2: MockEntity = { active: true, x: 600, y: 600 };

    it('bossProvider 미설정 시 기존 동작 (dishes만)', () => {
      const result = service.getActiveEntities();
      expect(result).toHaveLength(3);
    });

    it('getActiveEntities에 보스가 포함되어야 함', () => {
      service.setBossProvider(() => [boss1, boss2] as never);
      const result = service.getActiveEntities();
      expect(result).toHaveLength(5);
      expect(result).toContain(boss1);
      expect(result).toContain(boss2);
    });

    it('forEachActive에 보스가 포함되어야 함', () => {
      service.setBossProvider(() => [boss1] as never);
      const visited: MockEntity[] = [];
      service.forEachActive((e) => visited.push(e as unknown as MockEntity));
      expect(visited).toHaveLength(4);
      expect(visited).toContain(boss1);
    });

    it('getEntitiesInRadius에 보스가 포함되어야 함', () => {
      service.setBossProvider(() => [boss1] as never);
      // boss1 at (500,500), query at (500,500,10) → should find boss
      const result = service.getEntitiesInRadius(500, 500, 10);
      expect(result).toHaveLength(1);
      expect(result[0]).toBe(boss1);
    });

    it('getEntitiesWithCondition에 보스가 포함되어야 함', () => {
      service.setBossProvider(() => [boss1, boss2] as never);
      const result = service.getEntitiesWithCondition((e) => e.x >= 500);
      expect(result).toHaveLength(2);
      expect(result).toContain(boss1);
      expect(result).toContain(boss2);
    });

    it('빈 보스 프로바이더는 기존 동작에 영향을 주지 않아야 함', () => {
      service.setBossProvider(() => []);
      const result = service.getActiveEntities();
      expect(result).toHaveLength(3);
    });
  });
});
