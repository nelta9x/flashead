import { AbilityManager } from '../../../../systems/AbilityManager';
import { AbilityDataRepository } from './AbilityDataRepository';
import { AbilityProgressionService } from './AbilityProgressionService';

export class AbilityRuntimeQueryService {
  constructor(
    private readonly abilityManager: AbilityManager,
    private readonly abilityProgression: AbilityProgressionService,
    private readonly abilityData: AbilityDataRepository,
  ) {}

  getAbilityLevelOrThrow(abilityId: string): number {
    return this.abilityProgression.getAbilityLevel(abilityId);
  }

  getEffectValueOrThrow(abilityId: string, key: string): number {
    this.abilityData.assertEffectKeyOrThrow(abilityId, key);

    if (this.abilityData.isLevelEffectKey(abilityId, key)) {
      return this.abilityManager.getEffectValueOrThrow(abilityId, key);
    }

    const staticValue = this.abilityData.getStaticNumericEffectOrNull(abilityId, key);
    if (staticValue === null) {
      throw new Error(`Unknown effect key "${key}" for ability "${abilityId}"`);
    }
    return staticValue;
  }
}
