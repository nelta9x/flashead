import { PluginRegistry } from '../../PluginRegistry';
import { CoreServicesPlugin } from './CoreServicesPlugin';
import { EcsFoundationPlugin } from './EcsFoundationPlugin';
import { GameModulesPlugin } from './GameModulesPlugin';

export function registerBuiltinServicePlugins(): void {
  const r = PluginRegistry.getInstance();
  r.registerServicePlugin(new CoreServicesPlugin());
  r.registerServicePlugin(new EcsFoundationPlugin());
  r.registerServicePlugin(new GameModulesPlugin());
}
