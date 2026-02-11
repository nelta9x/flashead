import type { EntitySystem } from './EntitySystem';
import type { World } from '../../world';
import type { StatusEffectManager } from '../StatusEffectManager';

export class EntityStatusSystem implements EntitySystem {
  readonly id = 'core:entity_status';
  enabled = true;

  constructor(
    private readonly world: World,
    private readonly sem: StatusEffectManager,
  ) {}

  tick(_delta: number): void {
    this.world.statusCache.forEach((entityId, statusCache) => {
      if (!this.world.isActive(entityId)) return;

      statusCache.isFrozen = this.sem.hasEffect(entityId, 'freeze') || this.sem.hasEffect(entityId, 'slow');
      const slowEffects = this.sem.getEffectsByType(entityId, 'slow');
      statusCache.slowFactor = slowEffects.length > 0
        ? Math.min(...slowEffects.map(e => (e.data['factor'] as number) ?? 1.0))
        : 1.0;
    });
  }
}
