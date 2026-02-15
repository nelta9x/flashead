import { describe, expect, it, vi } from 'vitest';
import type { AbilityManager } from '../src/systems/AbilityManager';
import type { AbilityDefinition, SystemUpgradeData } from '../src/data/types';
import { AbilityDataRepository } from '../src/plugins/builtin/services/abilities/AbilityDataRepository';
import { AbilityProgressionService } from '../src/plugins/builtin/services/abilities/AbilityProgressionService';
import { AbilityRuntimeQueryService } from '../src/plugins/builtin/services/abilities/AbilityRuntimeQueryService';

function createAbilityDefinition(): AbilityDefinition {
  return {
    id: 'test_ability',
    pluginId: 'test_plugin',
    upgradeId: 'test_upgrade',
    icon: {
      key: 'test_ability',
      path: 'assets/icons/test_ability.svg',
      width: 64,
      height: 64,
    },
  };
}

function createUpgradeData(): SystemUpgradeData {
  return {
    id: 'test_upgrade',
    name: 'Test Ability',
    description: 'Test Description',
    rarity: 'common',
    effectType: 'testEffect',
    previewDisplay: {
      stats: [{ id: 'damage', labelKey: 'upgrade.stat.damage' }],
    },
    hitInterval: 450,
    levels: [
      {
        damage: 10,
        count: 1,
      },
    ],
  };
}

describe('AbilityRuntimeQueryService', () => {
  it('throws on unknown ability', () => {
    const repository = new AbilityDataRepository([createAbilityDefinition()], [createUpgradeData()]);
    const progression = new AbilityProgressionService(repository);
    const abilityManager = {
      getEffectValueOrThrow: vi.fn(() => 10),
    } as unknown as AbilityManager;
    const query = new AbilityRuntimeQueryService(abilityManager, progression, repository);

    expect(() => query.getEffectValueOrThrow('missing_ability', 'damage')).toThrow(
      /Unknown ability id/,
    );
  });

  it('throws on unknown effect key', () => {
    const repository = new AbilityDataRepository([createAbilityDefinition()], [createUpgradeData()]);
    const progression = new AbilityProgressionService(repository);
    const abilityManager = {
      getEffectValueOrThrow: vi.fn(() => 10),
    } as unknown as AbilityManager;
    const query = new AbilityRuntimeQueryService(abilityManager, progression, repository);

    expect(() => query.getEffectValueOrThrow('test_ability', 'unknownKey')).toThrow(
      /Unknown effect key/,
    );
  });

  it('returns plugin-level effect for level keys', () => {
    const repository = new AbilityDataRepository([createAbilityDefinition()], [createUpgradeData()]);
    const progression = new AbilityProgressionService(repository);
    progression.applyChoice('test_ability');

    const abilityManager = {
      getEffectValueOrThrow: vi.fn(() => 99),
    } as unknown as AbilityManager;
    const query = new AbilityRuntimeQueryService(abilityManager, progression, repository);

    expect(query.getEffectValueOrThrow('test_ability', 'damage')).toBe(99);
    expect(abilityManager.getEffectValueOrThrow).toHaveBeenCalledWith('test_ability', 'damage');
  });

  it('returns static numeric effect for static keys', () => {
    const repository = new AbilityDataRepository([createAbilityDefinition()], [createUpgradeData()]);
    const progression = new AbilityProgressionService(repository);
    const abilityManager = {
      getEffectValueOrThrow: vi.fn(() => 10),
    } as unknown as AbilityManager;
    const query = new AbilityRuntimeQueryService(abilityManager, progression, repository);

    expect(query.getEffectValueOrThrow('test_ability', 'hitInterval')).toBe(450);
    expect(abilityManager.getEffectValueOrThrow).not.toHaveBeenCalled();
  });
});
