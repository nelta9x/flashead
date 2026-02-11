import type { AbilityPlugin, AbilityContext } from '../plugins/types';
import { PluginRegistry } from '../plugins/PluginRegistry';

export class AbilityManager {
  private readonly plugins: AbilityPlugin[] = [];
  private initialized = false;

  init(ctx: AbilityContext): void {
    this.plugins.length = 0;

    const registry = PluginRegistry.getInstance();
    for (const [, plugin] of registry.getAllAbilities()) {
      plugin.init(ctx);
      this.plugins.push(plugin);
    }

    this.initialized = true;
  }

  update(delta: number, gameTime: number, playerX: number, playerY: number): void {
    if (!this.initialized) return;

    for (const plugin of this.plugins) {
      plugin.update(delta, gameTime, playerX, playerY);
    }
  }

  getEffectValue(abilityId: string, key: string): number {
    const plugin = this.plugins.find((p) => p.id === abilityId);
    return plugin?.getEffectValue(key) ?? 0;
  }

  clear(): void {
    for (const plugin of this.plugins) {
      plugin.clear();
    }
  }

  destroy(): void {
    for (const plugin of this.plugins) {
      plugin.destroy();
    }
    this.plugins.length = 0;
    this.initialized = false;
  }
}
