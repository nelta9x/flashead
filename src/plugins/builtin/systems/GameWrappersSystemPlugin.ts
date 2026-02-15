import { WaveSystem } from '../services/WaveSystem';
import { EntityQueryService } from '../../../systems/EntityQueryService';
import { StatusEffectManager } from '../../../systems/StatusEffectManager';
import { BossCombatCoordinator } from '../services/BossCombatCoordinator';
import { ModSystemRegistry } from '../../ModSystemRegistry';
import { AbilityManager } from '../../../systems/AbilityManager';
import { WaveTickSystem } from './WaveTickSystem';
import { BossCoordinatorSystem } from './BossCoordinatorSystem';
import { ModTickSystem } from './ModTickSystem';
import { AbilityTickSystem } from './AbilityTickSystem';
import type { EntitySystem } from '../../../systems/entity-systems/EntitySystem';
import type { SystemPlugin, SystemPluginContext } from '../../types/SystemPlugin';

export class GameWrappersSystemPlugin implements SystemPlugin {
  readonly id = 'core:game_wrappers';

  createSystems(ctx: SystemPluginContext): EntitySystem[] {
    return [
      new WaveTickSystem(ctx.services.get(WaveSystem), ctx.world),
      new BossCoordinatorSystem(ctx.services.get(BossCombatCoordinator), ctx.world),
      new AbilityTickSystem(ctx.services.get(AbilityManager), ctx.world),
      new ModTickSystem(
        ctx.services.get(ModSystemRegistry),
        () => ({
          entities: ctx.services.get(EntityQueryService),
          statusEffectManager: ctx.services.get(StatusEffectManager),
        }),
      ),
    ];
  }
}
