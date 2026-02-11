import type { Entity } from '../entities/Entity';
import type { ObjectPool } from '../utils/ObjectPool';

/**
 * EntityQueryService: dishPool을 감싸는 읽기 전용 쿼리 파사드.
 * 기존 dishPool 소비 코드 수정 없이 MOD에 엔티티 접근을 제공한다.
 * setBossProvider()로 보스 엔티티도 포함할 수 있다.
 */
export class EntityQueryService {
  private bossProvider: (() => Entity[]) | null = null;

  constructor(private readonly pool: ObjectPool<Entity>) {}

  setBossProvider(provider: () => Entity[]): void {
    this.bossProvider = provider;
  }

  getActiveEntities(): Entity[] {
    const result = Array.from(this.pool.getActiveObjects());
    if (this.bossProvider) {
      result.push(...this.bossProvider());
    }
    return result;
  }

  forEachActive(callback: (e: Entity) => void): void {
    this.pool.forEach(callback);
    if (this.bossProvider) {
      for (const boss of this.bossProvider()) {
        callback(boss);
      }
    }
  }

  getEntitiesInRadius(x: number, y: number, radius: number): Entity[] {
    const result: Entity[] = [];
    const radiusSq = radius * radius;
    const check = (entity: Entity) => {
      const dx = entity.x - x;
      const dy = entity.y - y;
      if (dx * dx + dy * dy <= radiusSq) {
        result.push(entity);
      }
    };
    this.pool.forEach(check);
    if (this.bossProvider) {
      for (const boss of this.bossProvider()) {
        check(boss);
      }
    }
    return result;
  }

  getEntitiesWithCondition(predicate: (e: Entity) => boolean): Entity[] {
    const result: Entity[] = [];
    const check = (entity: Entity) => {
      if (predicate(entity)) {
        result.push(entity);
      }
    };
    this.pool.forEach(check);
    if (this.bossProvider) {
      for (const boss of this.bossProvider()) {
        check(boss);
      }
    }
    return result;
  }
}
