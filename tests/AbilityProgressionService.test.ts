import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AbilityDefinition, SystemUpgradeData } from '../src/data/types';
import { AbilityDataRepository } from '../src/plugins/builtin/services/abilities/AbilityDataRepository';
import { AbilityProgressionService } from '../src/plugins/builtin/services/abilities/AbilityProgressionService';
import { GameEvents } from '../src/utils/EventBus';

const emitMock = vi.fn();
vi.mock('../src/utils/EventBus', () => ({
  EventBus: {
    getInstance: () => ({
      emit: emitMock,
    }),
  },
  GameEvents: {
    HEALTH_PACK_UPGRADED: 'healthPack:upgraded',
    CURSE_HP_PENALTY: 'curse:hpPenalty',
  },
}));

function createDefinitions(): AbilityDefinition[] {
  return [
    {
      id: 'test_ability',
      pluginId: 'test_plugin',
      upgradeId: 'test_upgrade',
      icon: {
        key: 'test_ability',
        path: 'assets/icons/test_ability.svg',
        width: 64,
        height: 64,
      },
    },
    {
      id: 'health_pack',
      pluginId: 'health_pack',
      upgradeId: 'health_pack',
      icon: {
        key: 'health_pack',
        path: 'assets/icons/health_pack.svg',
        width: 64,
        height: 64,
      },
    },
    {
      id: 'glass_cannon',
      pluginId: 'glass_cannon',
      upgradeId: 'glass_cannon',
      icon: {
        key: 'glass_cannon',
        path: 'assets/icons/glass_cannon.svg',
        width: 64,
        height: 64,
      },
    },
  ];
}

function createUpgrades(): SystemUpgradeData[] {
  return [
    {
      id: 'test_upgrade',
      name: 'Test Ability',
      description: 'Test Description',
      rarity: 'common',
      effectType: 'testEffect',
      previewDisplay: {
        stats: [{ id: 'damage', labelKey: 'upgrade.stat.damage' }],
      },
      levels: [
        { damage: 10, count: 1 },
        { damage: 20, count: 2 },
      ],
    },
    {
      id: 'health_pack',
      name: 'Health Pack',
      description: 'HP',
      rarity: 'rare',
      effectType: 'healthPackLevel',
      previewDisplay: {
        stats: [{ id: 'hpBonus', labelKey: 'upgrade.stat.hp' }],
      },
      levels: [
        { hpBonus: 5, dropChanceBonus: 0.01 },
      ],
      maxStack: 99,
    },
    {
      id: 'glass_cannon',
      name: 'Glass Cannon',
      description: 'Curse',
      rarity: 'epic',
      effectType: 'glassCannonLevel',
      previewDisplay: {
        stats: [{ id: 'hpPenalty', labelKey: 'upgrade.stat.hpPenalty' }],
      },
      levels: [
        { damageMultiplier: 1.2, hpPenalty: 2 },
      ],
      isCurse: true,
    },
  ];
}

describe('AbilityProgressionService', () => {
  beforeEach(() => {
    emitMock.mockReset();
  });

  it('caps non-consumable ability level at max level', () => {
    const repository = new AbilityDataRepository(createDefinitions(), createUpgrades());
    const progression = new AbilityProgressionService(repository);

    progression.applyChoice('test_ability');
    progression.applyChoice('test_ability');
    progression.applyChoice('test_ability');

    expect(progression.getAbilityLevel('test_ability')).toBe(2);
  });

  it('emits health pack upgrade event with hpBonus', () => {
    const repository = new AbilityDataRepository(createDefinitions(), createUpgrades());
    const progression = new AbilityProgressionService(repository);

    progression.applyChoice('health_pack');

    expect(emitMock).toHaveBeenCalledWith(GameEvents.HEALTH_PACK_UPGRADED, { hpBonus: 5 });
  });

  it('emits curse hp penalty event when glass cannon is applied', () => {
    const repository = new AbilityDataRepository(createDefinitions(), createUpgrades());
    const progression = new AbilityProgressionService(repository);

    progression.applyChoice('glass_cannon');

    expect(emitMock).toHaveBeenCalledWith(GameEvents.CURSE_HP_PENALTY, { hpPenalty: 2 });
  });

  it('rollChoices returns ability choices with canonical ability ids', () => {
    const repository = new AbilityDataRepository(createDefinitions(), createUpgrades());
    const progression = new AbilityProgressionService(repository);

    const choices = progression.rollChoices(3);
    const ids = choices.map((choice) => choice.abilityId);
    expect(ids).toContain('test_ability');
    expect(ids).toContain('health_pack');
    expect(ids).toContain('glass_cannon');
  });
});
