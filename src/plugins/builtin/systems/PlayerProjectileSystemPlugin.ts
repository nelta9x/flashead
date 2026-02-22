import { PlayerProjectileSystem } from './PlayerProjectileSystem';
import { SpatialIndex } from '../../../systems/SpatialIndex';
import { EntityDamageService } from '../services/EntityDamageService';
import { BossCombatCoordinator } from '../services/BossCombatCoordinator';
import type { EntitySystem } from '../../../systems/entity-systems/EntitySystem';
import type { SystemPlugin, SystemPluginContext } from '../../types/SystemPlugin';

export class PlayerProjectileSystemPlugin implements SystemPlugin {
  readonly id = 'core:player_projectile_system';

  createSystems(ctx: SystemPluginContext): EntitySystem[] {
    return [
      new PlayerProjectileSystem(
        ctx.scene,
        ctx.world,
        ctx.services.get(SpatialIndex),
        ctx.services.get(EntityDamageService),
        ctx.services.get(BossCombatCoordinator),
      ),
    ];
  }
}
