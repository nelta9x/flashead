import type {
  UpgradePreviewCardModel,
  UpgradePreviewRowModel,
  UpgradePreviewStatId,
} from '../../../../data/types/upgrades';
import { AbilityManager } from '../../../../systems/AbilityManager';
import { UpgradeDescriptionFormatter } from '../upgrades/UpgradeDescriptionFormatter';
import { UpgradePreviewModelBuilder } from '../upgrades/UpgradePreviewModelBuilder';
import { AbilityDataRepository } from './AbilityDataRepository';
import { AbilityProgressionService } from './AbilityProgressionService';

const INVERSE_IMPROVEMENT_STATS = new Set<UpgradePreviewStatId>([
  'damageInterval',
  'spawnInterval',
  'hpPenalty',
]);

const PERCENT_STATS = new Set<UpgradePreviewStatId>([
  'sizeBonus',
  'missileThicknessBonus',
  'criticalChance',
  'dropChanceBonus',
  'damageMultiplier',
  'missingHpDamagePercent',
  'nonCritPenalty',
]);

export class AbilityPresentationService {
  private readonly descriptionFormatter: UpgradeDescriptionFormatter;
  private readonly previewModelBuilder: UpgradePreviewModelBuilder;

  constructor(
    private readonly abilityProgression: AbilityProgressionService,
    private readonly abilityData: AbilityDataRepository,
    private readonly abilityManager: AbilityManager,
  ) {
    this.descriptionFormatter = new UpgradeDescriptionFormatter(
      (abilityId) => this.abilityProgression.getAbilityLevel(abilityId),
      (abilityId) => this.abilityData.getUpgradeDataOrThrow(abilityId)
    );

    this.previewModelBuilder = new UpgradePreviewModelBuilder({
      getAbilityLevel: (abilityId) => this.abilityProgression.getAbilityLevel(abilityId),
      getSystemUpgrade: (abilityId) => this.abilityData.getUpgradeDataOrThrow(abilityId),
    });
  }

  getFormattedDescriptionOrThrow(abilityId: string): string {
    this.abilityData.getAbilityDefinitionOrThrow(abilityId);
    return this.descriptionFormatter.getFormattedDescription(abilityId);
  }

  getPreviewCardModelOrNull(abilityId: string): UpgradePreviewCardModel | null {
    this.abilityData.getAbilityDefinitionOrThrow(abilityId);
    const model = this.previewModelBuilder.build(abilityId);
    if (!model) return null;
    return this.mergeDerivedStats(abilityId, model);
  }

  getPreviewCardModelOrThrow(abilityId: string): UpgradePreviewCardModel {
    const model = this.getPreviewCardModelOrNull(abilityId);
    if (!model) {
      throw new Error(`Preview model missing for ability "${abilityId}"`);
    }
    return model;
  }

  private mergeDerivedStats(
    abilityId: string,
    model: UpgradePreviewCardModel,
  ): UpgradePreviewCardModel {
    const plugin = this.abilityManager.getPluginOrThrow(abilityId);
    if (!plugin.getDerivedStats) {
      return model;
    }

    const derivedEntries = plugin.getDerivedStats(model.currentLevel, model.nextLevel);
    if (derivedEntries.length === 0) {
      return model;
    }

    const rows = [...model.rows];
    const rowIndexById = new Map<string, number>();
    rows.forEach((row, index) => rowIndexById.set(row.id, index));

    for (const entry of derivedEntries) {
      const deltaValue = entry.nextValue - entry.currentValue;
      if (Math.abs(deltaValue) < Number.EPSILON) {
        continue;
      }

      const id = entry.id as UpgradePreviewStatId;
      const row: UpgradePreviewRowModel = {
        id,
        label: entry.label,
        currentValue: entry.currentValue,
        nextValue: entry.nextValue,
        deltaValue,
        currentDisplay: this.formatValue(id, entry.currentValue),
        nextDisplay: this.formatValue(id, entry.nextValue),
        deltaDisplay: this.formatDelta(id, deltaValue),
        isImprovement: this.isImprovement(id, deltaValue),
        isDerived: true,
      };

      const rowIndex = rowIndexById.get(entry.id);
      if (rowIndex === undefined) {
        rowIndexById.set(entry.id, rows.length);
        rows.push(row);
      } else {
        rows[rowIndex] = row;
      }
    }

    return {
      ...model,
      rows,
    };
  }

  private isImprovement(statId: UpgradePreviewStatId, deltaValue: number): boolean {
    if (INVERSE_IMPROVEMENT_STATS.has(statId)) {
      return deltaValue < 0;
    }
    return deltaValue > 0;
  }

  private formatValue(statId: UpgradePreviewStatId, value: number): string {
    if (PERCENT_STATS.has(statId)) {
      return `${Math.round(value * 100)}%`;
    }
    return `${Math.round(value)}`;
  }

  private formatDelta(statId: UpgradePreviewStatId, deltaValue: number): string {
    const sign = deltaValue >= 0 ? '+' : '-';
    const absDelta = Math.abs(deltaValue);
    if (PERCENT_STATS.has(statId)) {
      return `${sign}${Math.round(absDelta * 100)}%`;
    }
    return `${sign}${Math.round(absDelta)}`;
  }
}
