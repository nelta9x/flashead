import { describe, expect, it, vi } from 'vitest';
import type { AbilityManager } from '../src/systems/AbilityManager';
import { AbilityDataRepository } from '../src/plugins/builtin/services/abilities/AbilityDataRepository';
import { AbilityProgressionService } from '../src/plugins/builtin/services/abilities/AbilityProgressionService';
import { AbilityRuntimeQueryService } from '../src/plugins/builtin/services/abilities/AbilityRuntimeQueryService';
import { AbilityPresentationService } from '../src/plugins/builtin/services/abilities/AbilityPresentationService';
import {
  ABILITY_IDS,
  CURSOR_SIZE_EFFECT_KEYS,
  ORBITING_ORB_EFFECT_KEYS,
} from '../src/plugins/builtin/services/upgrades/AbilityEffectCatalog';

function createMockAbilityManager(
  abilityData: AbilityDataRepository,
  abilityProgression: AbilityProgressionService,
): AbilityManager {
  return {
    getEffectValueOrThrow: vi.fn((abilityId: string, key: string) => {
      const level = abilityProgression.getAbilityLevel(abilityId);
      const levelData = abilityData.getLevelDataOrNull<Record<string, unknown>>(abilityId, level);
      if (!levelData) return 0;
      const value = levelData[key];
      if (typeof value !== 'number') {
        throw new Error(`Unknown effect key "${key}" for ability "${abilityId}"`);
      }
      return value;
    }),
    getPluginOrThrow: vi.fn((abilityId: string) => ({
      id: abilityId,
      init: vi.fn(),
      update: vi.fn(),
      clear: vi.fn(),
      destroy: vi.fn(),
      createRenderer: vi.fn(() => null),
      getEffectValue: vi.fn(() => 0),
      getDerivedStats: vi.fn(() => []),
    })),
  } as unknown as AbilityManager;
}

describe('AbilityEffects', () => {
  it('resolves level-based and static effects via ability services', () => {
    const abilityData = new AbilityDataRepository();
    const abilityProgression = new AbilityProgressionService(abilityData);
    const abilityManager = createMockAbilityManager(abilityData, abilityProgression);
    const runtimeQuery = new AbilityRuntimeQueryService(
      abilityManager,
      abilityProgression,
      abilityData,
    );

    expect(
      runtimeQuery.getEffectValueOrThrow(ABILITY_IDS.CURSOR_SIZE, CURSOR_SIZE_EFFECT_KEYS.SIZE_BONUS),
    ).toBe(0);

    abilityProgression.applyChoice(ABILITY_IDS.CURSOR_SIZE);
    expect(
      runtimeQuery.getEffectValueOrThrow(ABILITY_IDS.CURSOR_SIZE, CURSOR_SIZE_EFFECT_KEYS.SIZE_BONUS),
    ).toBeGreaterThan(0);

    expect(
      runtimeQuery.getEffectValueOrThrow(
        ABILITY_IDS.ORBITING_ORB,
        ORBITING_ORB_EFFECT_KEYS.HIT_INTERVAL,
      ),
    ).toBeGreaterThan(0);
  });

  it('throws on unknown effect key in strict mode', () => {
    const abilityData = new AbilityDataRepository();
    const abilityProgression = new AbilityProgressionService(abilityData);
    const abilityManager = createMockAbilityManager(abilityData, abilityProgression);
    const runtimeQuery = new AbilityRuntimeQueryService(
      abilityManager,
      abilityProgression,
      abilityData,
    );

    expect(() =>
      runtimeQuery.getEffectValueOrThrow(ABILITY_IDS.CURSOR_SIZE, 'missing_key'),
    ).toThrow(/Unknown effect key/);
  });

  it('builds preview/description through AbilityPresentationService', () => {
    const abilityData = new AbilityDataRepository();
    const abilityProgression = new AbilityProgressionService(abilityData);
    abilityProgression.applyChoice(ABILITY_IDS.CURSOR_SIZE);

    const abilityManager = createMockAbilityManager(abilityData, abilityProgression);
    const presentation = new AbilityPresentationService(
      abilityProgression,
      abilityData,
      abilityManager,
    );

    const description = presentation.getFormattedDescriptionOrThrow(ABILITY_IDS.CURSOR_SIZE);
    expect(description.length).toBeGreaterThan(0);

    const preview = presentation.getPreviewCardModelOrNull(ABILITY_IDS.CURSOR_SIZE);
    expect(preview).not.toBeNull();
    expect(preview?.rows.length).toBeGreaterThan(0);
  });
});
