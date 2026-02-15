import type { EntitySystem } from '../../../systems/entity-systems/EntitySystem';
import type { AbilityManager } from '../../../systems/AbilityManager';
import type { World } from '../../../world';

/**
 * AbilityTickSystem: runs all ability plugin updates inside the ECS pipeline.
 */
export class AbilityTickSystem implements EntitySystem {
  readonly id = 'core:ability_tick';
  enabled = true;

  constructor(
    private readonly abilityManager: AbilityManager,
    private readonly world: World,
  ) {}

  tick(delta: number): void {
    const playerId = this.world.context.playerId;
    if (!this.world.isActive(playerId)) return;

    const playerTransform = this.world.transform.get(playerId);
    if (!playerTransform) return;

    this.abilityManager.update(
      delta,
      this.world.context.gameTime,
      playerTransform.x,
      playerTransform.y,
    );
  }
}
