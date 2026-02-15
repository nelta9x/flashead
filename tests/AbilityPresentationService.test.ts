import { describe, expect, it, vi } from 'vitest';
import type { AbilityManager } from '../src/systems/AbilityManager';
import type { AbilityDefinition, SystemUpgradeData } from '../src/data/types';
import { AbilityDataRepository } from '../src/plugins/builtin/services/abilities/AbilityDataRepository';
import { AbilityProgressionService } from '../src/plugins/builtin/services/abilities/AbilityProgressionService';
import { AbilityPresentationService } from '../src/plugins/builtin/services/abilities/AbilityPresentationService';

function createDefinitions(): AbilityDefinition[] {
  return [
    {
      id: 'cursor_size',
      pluginId: 'cursor_size',
      upgradeId: 'cursor_size',
      icon: {
        key: 'cursor_size',
        path: 'assets/icons/cursor_size.svg',
        width: 64,
        height: 64,
      },
    },
  ];
}

function createUpgrades(): SystemUpgradeData[] {
  return [
    {
      id: 'cursor_size',
      name: 'Cursor Size',
      description: 'Cursor',
      rarity: 'common',
      effectType: 'cursorSizeLevel',
      previewDisplay: {
        stats: [
          { id: 'cursorRadiusPx', labelKey: 'upgrade.stat.cursor_radius' },
          { id: 'damage', labelKey: 'upgrade.stat.damage' },
        ],
      },
      levels: [
        { sizeBonus: 0.2, damage: 1, missileThicknessBonus: 0.1 },
        { sizeBonus: 0.4, damage: 2, missileThicknessBonus: 0.2 },
      ],
    },
  ];
}

describe('AbilityPresentationService', () => {
  it('builds preview model and merges plugin derived stats', () => {
    const repository = new AbilityDataRepository(createDefinitions(), createUpgrades());
    const progression = new AbilityProgressionService(repository);
    progression.applyChoice('cursor_size');

    const abilityManager = {
      getPluginOrThrow: vi.fn(() => ({
        id: 'cursor_size',
        init: vi.fn(),
        update: vi.fn(),
        clear: vi.fn(),
        destroy: vi.fn(),
        createRenderer: vi.fn(() => null),
        getEffectValue: vi.fn(() => 0),
        getDerivedStats: vi.fn(() => [
          {
            id: 'cursorRadiusPx',
            label: 'Cursor Radius (Derived)',
            currentValue: 30,
            nextValue: 36,
          },
        ]),
      })),
    } as unknown as AbilityManager;

    const presentation = new AbilityPresentationService(
      progression,
      repository,
      abilityManager,
    );

    const model = presentation.getPreviewCardModelOrThrow('cursor_size');
    const derivedRow = model.rows.find((row) => row.id === 'cursorRadiusPx');
    expect(derivedRow).toBeDefined();
    expect(derivedRow?.label).toBe('Cursor Radius (Derived)');
    expect(derivedRow?.currentValue).toBe(30);
    expect(derivedRow?.nextValue).toBe(36);
  });

  it('throws on missing ability presentation request', () => {
    const repository = new AbilityDataRepository(createDefinitions(), createUpgrades());
    const progression = new AbilityProgressionService(repository);
    const abilityManager = {
      getPluginOrThrow: vi.fn(),
    } as unknown as AbilityManager;
    const presentation = new AbilityPresentationService(
      progression,
      repository,
      abilityManager,
    );

    expect(() => presentation.getFormattedDescriptionOrThrow('missing_ability')).toThrow(
      /Unknown ability id/,
    );
  });
});
