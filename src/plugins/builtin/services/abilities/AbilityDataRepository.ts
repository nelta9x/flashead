import { Data } from '../../../../data/DataManager';
import type {
  AbilityDefinition,
  SystemUpgradeData,
} from '../../../../data/types';

export class AbilityDataRepository {
  private readonly definitionsById = new Map<string, AbilityDefinition>();
  private readonly upgradesByAbilityId = new Map<string, SystemUpgradeData>();
  private readonly levelNumericKeysByAbilityId = new Map<string, Set<string>>();

  constructor(
    definitions: readonly AbilityDefinition[] = Data.getActiveAbilityDefinitions(),
    upgrades: readonly SystemUpgradeData[] = Data.upgrades.system,
  ) {
    const upgradesById = new Map<string, SystemUpgradeData>();
    for (const upgrade of upgrades) {
      upgradesById.set(upgrade.id, upgrade);
    }

    for (const definition of definitions) {
      if (this.definitionsById.has(definition.id)) {
        throw new Error(`Duplicate ability id in abilities.json: "${definition.id}"`);
      }
      this.definitionsById.set(definition.id, definition);

      const upgrade = upgradesById.get(definition.upgradeId);
      if (!upgrade) {
        throw new Error(
          `Missing upgrade "${definition.upgradeId}" mapped from ability "${definition.id}"`
        );
      }
      this.upgradesByAbilityId.set(definition.id, upgrade);

      const keys = new Set<string>();
      const firstLevel = upgrade.levels?.[0] as Record<string, unknown> | undefined;
      if (firstLevel) {
        for (const [key, value] of Object.entries(firstLevel)) {
          if (typeof value === 'number') {
            keys.add(key);
          }
        }
      }
      this.levelNumericKeysByAbilityId.set(definition.id, keys);
    }
  }

  getAllAbilityDefinitions(): readonly AbilityDefinition[] {
    return [...this.definitionsById.values()];
  }

  getAbilityDefinitionOrThrow(abilityId: string): AbilityDefinition {
    const definition = this.definitionsById.get(abilityId);
    if (!definition) {
      throw new Error(`Unknown ability id in abilities.json: "${abilityId}"`);
    }
    return definition;
  }

  getUpgradeDataOrThrow(abilityId: string): SystemUpgradeData {
    this.getAbilityDefinitionOrThrow(abilityId);
    const upgrade = this.upgradesByAbilityId.get(abilityId);
    if (!upgrade) {
      throw new Error(`Missing upgrade data for ability "${abilityId}"`);
    }
    return upgrade;
  }

  getLevelDataOrNull<T>(abilityId: string, level: number): T | null {
    const upgrade = this.getUpgradeDataOrThrow(abilityId);
    if (!upgrade.levels || upgrade.levels.length === 0) return null;
    if (level <= 0) return null;
    const index = Math.min(level, upgrade.levels.length) - 1;
    return upgrade.levels[index] as T;
  }

  isLevelEffectKey(abilityId: string, key: string): boolean {
    this.getAbilityDefinitionOrThrow(abilityId);
    const keys = this.levelNumericKeysByAbilityId.get(abilityId);
    return keys ? keys.has(key) : false;
  }

  getStaticNumericEffectOrNull(abilityId: string, key: string): number | null {
    const upgrade = this.getUpgradeDataOrThrow(abilityId);
    const value = (upgrade as unknown as Record<string, unknown>)[key];
    return typeof value === 'number' ? value : null;
  }

  assertEffectKeyOrThrow(abilityId: string, key: string): void {
    if (this.isLevelEffectKey(abilityId, key)) return;
    if (this.getStaticNumericEffectOrNull(abilityId, key) !== null) return;

    throw new Error(`Unknown effect key "${key}" for ability "${abilityId}"`);
  }
}
