import type { ModSystemRegistry, ModSystemSharedContext } from '../../ModSystemRegistry';
import type { EntitySystem } from '../../../systems/entity-systems/EntitySystem';

export class ModTickSystem implements EntitySystem {
  readonly id = 'core:mod_tick';
  enabled = true;

  private readonly modSystemRegistry: ModSystemRegistry;
  private readonly getContext: () => ModSystemSharedContext;

  constructor(modSystemRegistry: ModSystemRegistry, getContext: () => ModSystemSharedContext) {
    this.modSystemRegistry = modSystemRegistry;
    this.getContext = getContext;
  }

  tick(delta: number): void {
    this.modSystemRegistry.runAll(delta, this.getContext());
  }
}
