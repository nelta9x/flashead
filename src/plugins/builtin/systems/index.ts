import { PluginRegistry } from '../../PluginRegistry';
import { CoreWorldSystemsPlugin } from './CoreWorldSystemsPlugin';
import { PlayerSystemPlugin } from './PlayerSystemPlugin';
import { BossReactionSystemPlugin } from './BossReactionSystemPlugin';
import { MagnetSystemPlugin } from './MagnetSystemPlugin';
import { CursorAttackSystemPlugin } from './CursorAttackSystemPlugin';
import { BlackHoleSystemPlugin } from './BlackHoleSystemPlugin';
import { OrbSystemPlugin } from './OrbSystemPlugin';
import { FallingBombSystemPlugin } from './FallingBombSystemPlugin';
import { HealthPackSystemPlugin } from './HealthPackSystemPlugin';
import { GameLevelSystemsPlugin } from './GameLevelSystemsPlugin';
import { GameWrappersSystemPlugin } from './GameWrappersSystemPlugin';
import { SpaceshipSystemsPlugin } from './SpaceshipSystemsPlugin';
import { InitialSpawnSystemPlugin } from './InitialSpawnSystemPlugin';

export function registerBuiltinSystemPlugins(): void {
  const registry = PluginRegistry.getInstance();
  registry.registerSystemPlugin(new InitialSpawnSystemPlugin());
  registry.registerSystemPlugin(new CoreWorldSystemsPlugin());
  registry.registerSystemPlugin(new PlayerSystemPlugin());
  registry.registerSystemPlugin(new BossReactionSystemPlugin());
  registry.registerSystemPlugin(new MagnetSystemPlugin());
  registry.registerSystemPlugin(new CursorAttackSystemPlugin());
  registry.registerSystemPlugin(new BlackHoleSystemPlugin());
  registry.registerSystemPlugin(new OrbSystemPlugin());
  registry.registerSystemPlugin(new FallingBombSystemPlugin());
  registry.registerSystemPlugin(new HealthPackSystemPlugin());
  registry.registerSystemPlugin(new SpaceshipSystemsPlugin());
  registry.registerSystemPlugin(new GameLevelSystemsPlugin());
  registry.registerSystemPlugin(new GameWrappersSystemPlugin());
}
