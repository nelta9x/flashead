import type { AbilityPlugin, AbilityContext } from '../plugins/types';
import { PluginRegistry } from '../plugins/PluginRegistry';

export class AbilityManager {
  private readonly plugins: AbilityPlugin[] = [];
  private readonly pluginsById = new Map<string, AbilityPlugin>();
  private initialized = false;

  init(ctx: AbilityContext): void {
    this.plugins.length = 0;
    this.pluginsById.clear();

    const registry = PluginRegistry.getInstance();
    for (const [, plugin] of registry.getAllAbilities()) {
      plugin.init(ctx);
      this.plugins.push(plugin);
      this.pluginsById.set(plugin.id, plugin);
    }

    this.initialized = true;
  }

  update(delta: number, gameTime: number, playerX: number, playerY: number): void {
    if (!this.initialized) return;

    for (const plugin of this.plugins) {
      plugin.update(delta, gameTime, playerX, playerY);
    }
  }

  getPluginOrThrow(abilityId: string): AbilityPlugin {
    if (!this.initialized) {
      throw new Error('AbilityManager is not initialized');
    }
    const plugin = this.pluginsById.get(abilityId);
    if (!plugin) {
      throw new Error(`Ability plugin not found: "${abilityId}"`);
    }
    return plugin;
  }

  getEffectValueOrThrow(abilityId: string, key: string): number {
    const plugin = this.getPluginOrThrow(abilityId);
    return plugin.getEffectValue(key);
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
    this.pluginsById.clear();
    this.initialized = false;
  }
}
