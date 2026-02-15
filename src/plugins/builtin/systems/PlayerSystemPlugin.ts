import { PlayerTickSystem } from './PlayerTickSystem';
import { CursorRenderer } from '../entities/CursorRenderer';
import { CursorTrail } from '../entities/CursorTrail';
import { HealthSystem } from '../../../systems/HealthSystem';
import { AbilityProgressionService } from '../services/abilities/AbilityProgressionService';
import { AbilityRuntimeQueryService } from '../services/abilities/AbilityRuntimeQueryService';
import type { EntitySystem } from '../../../systems/entity-systems/EntitySystem';
import type { SystemPlugin, SystemPluginContext } from '../../types/SystemPlugin';

export class PlayerSystemPlugin implements SystemPlugin {
  readonly id = 'core:player_system';

  createSystems(ctx: SystemPluginContext): EntitySystem[] {
    return [
      new PlayerTickSystem(
        ctx.world,
        ctx.services.get(CursorRenderer),
        ctx.services.get(CursorTrail),
        ctx.services.get(AbilityRuntimeQueryService),
        ctx.services.get(AbilityProgressionService),
        ctx.services.get(HealthSystem),
      ),
    ];
  }
}
