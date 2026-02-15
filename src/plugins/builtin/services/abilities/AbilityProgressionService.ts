import { Data } from '../../../../data/DataManager';
import type { RarityWeights } from '../../../../data/types/upgrades';
import { UpgradeRarityRoller } from '../../../../systems/upgrades/UpgradeRarityRoller';
import { UpgradeStateStore } from '../../../../systems/upgrades/UpgradeStateStore';
import { EventBus, GameEvents } from '../../../../utils/EventBus';
import type { AbilityStateReader } from '../../../types';
import {
  ABILITY_IDS,
  GLASS_CANNON_EFFECT_KEYS,
  HEALTH_PACK_EFFECT_KEYS,
} from '../upgrades/AbilityEffectCatalog';
import { AbilityDataRepository } from './AbilityDataRepository';

export interface AbilityChoice {
  abilityId: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  name: string;
  description: string;
  maxLevel: number;
  isCurse: boolean;
}

interface RollableAbilityChoice extends AbilityChoice {
  id: string;
  maxStack: number;
}

export class AbilityProgressionService implements AbilityStateReader {
  private readonly stateStore = new UpgradeStateStore();
  private readonly rarityRoller = new UpgradeRarityRoller();
  private readonly rollableChoices: RollableAbilityChoice[];

  constructor(private readonly abilityData: AbilityDataRepository) {
    this.rollableChoices = this.buildRollableChoices();
  }

  reset(): void {
    this.stateStore.reset();
  }

  getAbilityLevel(abilityId: string): number {
    this.abilityData.getAbilityDefinitionOrThrow(abilityId);
    return this.stateStore.getStack(abilityId);
  }

  getAllAbilityLevels(): Map<string, number> {
    return this.stateStore.getAllStacks();
  }

  rollChoices(count: number): AbilityChoice[] {
    const rarityWeights = this.getRarityWeights();
    const choices = this.rarityRoller.selectRandomUpgrades(
      this.rollableChoices,
      (abilityId) => this.getAbilityLevel(abilityId),
      count,
      rarityWeights
    );
    return choices.map((choice) => ({
      abilityId: choice.abilityId,
      rarity: choice.rarity,
      name: choice.name,
      description: choice.description,
      maxLevel: choice.maxLevel,
      isCurse: choice.isCurse,
    }));
  }

  applyChoice(abilityId: string): void {
    const choice = this.getChoiceOrThrow(abilityId);
    const currentLevel = this.getAbilityLevel(abilityId);

    // health_pack은 영구 강화가 아니므로 레벨 캡 제한을 적용하지 않는다.
    if (abilityId !== ABILITY_IDS.HEALTH_PACK && currentLevel >= choice.maxLevel) {
      return;
    }

    const nextLevel = this.stateStore.incrementStack(abilityId);
    this.emitAbilityAppliedEvents(abilityId, nextLevel);
  }

  private getRarityWeights(): RarityWeights {
    const totalUpgrades = this.getTotalUpgradeCount();
    return Data.getRarityWeights(totalUpgrades);
  }

  private getTotalUpgradeCount(): number {
    return this.stateStore.getTotalStackCount([ABILITY_IDS.HEALTH_PACK]);
  }

  private buildRollableChoices(): RollableAbilityChoice[] {
    return this.abilityData.getAllAbilityDefinitions().map((definition) => {
      const upgrade = this.abilityData.getUpgradeDataOrThrow(definition.id);
      const maxLevel = upgrade.levels?.length ?? (upgrade.maxStack ?? 999);

      return {
        id: definition.id,
        abilityId: definition.id,
        rarity: upgrade.rarity,
        name: upgrade.name,
        description: upgrade.description,
        maxLevel,
        maxStack: maxLevel,
        isCurse: upgrade.isCurse ?? false,
      };
    });
  }

  private getChoiceOrThrow(abilityId: string): RollableAbilityChoice {
    const choice = this.rollableChoices.find((entry) => entry.abilityId === abilityId);
    if (!choice) {
      throw new Error(`Unknown ability id in progression service: "${abilityId}"`);
    }
    return choice;
  }

  private emitAbilityAppliedEvents(abilityId: string, nextLevel: number): void {
    if (abilityId === ABILITY_IDS.HEALTH_PACK) {
      const levelData = this.abilityData.getLevelDataOrNull<Record<string, unknown>>(
        abilityId,
        nextLevel,
      );
      const hpBonus = levelData?.[HEALTH_PACK_EFFECT_KEYS.HP_BONUS];
      if (typeof hpBonus !== 'number') {
        throw new Error(
          `Missing "${HEALTH_PACK_EFFECT_KEYS.HP_BONUS}" for ability "${abilityId}" level ${nextLevel}`
        );
      }
      EventBus.getInstance().emit(GameEvents.HEALTH_PACK_UPGRADED, { hpBonus });
      return;
    }

    if (abilityId === ABILITY_IDS.GLASS_CANNON) {
      const levelData = this.abilityData.getLevelDataOrNull<Record<string, unknown>>(
        abilityId,
        nextLevel,
      );
      const hpPenalty = levelData?.[GLASS_CANNON_EFFECT_KEYS.HP_PENALTY];
      if (typeof hpPenalty !== 'number') {
        throw new Error(
          `Missing "${GLASS_CANNON_EFFECT_KEYS.HP_PENALTY}" for ability "${abilityId}" level ${nextLevel}`
        );
      }
      EventBus.getInstance().emit(GameEvents.CURSE_HP_PENALTY, { hpPenalty });
    }
  }
}
