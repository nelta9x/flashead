import { PluginRegistry } from '../../PluginRegistry';
import { CursorSizeAbility } from './CursorSizeAbility';
import { CriticalChanceAbility } from './CriticalChanceAbility';
import { MissileAbility } from './MissileAbility';
import { HealthPackAbility } from './HealthPackAbility';
import { MagnetAbility } from './MagnetAbility';
import { ElectricShockAbility } from './ElectricShockAbility';
import { OrbAbility } from './OrbAbility';
import { BlackHoleAbility } from './BlackHoleAbility';

export function registerBuiltinAbilities(): void {
  const registry = PluginRegistry.getInstance();

  registry.registerAbility(new CursorSizeAbility());
  registry.registerAbility(new CriticalChanceAbility());
  registry.registerAbility(new MissileAbility());
  registry.registerAbility(new HealthPackAbility());
  registry.registerAbility(new MagnetAbility());
  registry.registerAbility(new ElectricShockAbility());
  registry.registerAbility(new OrbAbility());
  registry.registerAbility(new BlackHoleAbility());
}
