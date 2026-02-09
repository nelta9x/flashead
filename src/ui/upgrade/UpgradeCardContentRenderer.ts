import Phaser from 'phaser';
import { Data } from '../../data/DataManager';
import { FONTS } from '../../data/constants';
import type { UpgradePreviewCardModel } from '../../data/types/upgrades';

interface RenderUpgradeCardContentArgs {
  scene: Phaser.Scene;
  container: Phaser.GameObjects.Container;
  previewModel: UpgradePreviewCardModel;
  boxWidth: number;
  boxHeight: number;
}

export interface RenderUpgradeCardContentResult {
  emphasisTexts: Phaser.GameObjects.Text[];
}

export function renderUpgradeCardContent({
  scene,
  container,
  previewModel,
  boxWidth,
  boxHeight,
}: RenderUpgradeCardContentArgs): RenderUpgradeCardContentResult {
  const cfg = Data.gameConfig.upgradeUI.readabilityCard;
  const textCfg = Data.gameConfig.textSettings;
  const topY = -boxHeight / 2;
  const emphasisTexts: Phaser.GameObjects.Text[] = [];

  const levelText = scene.add
    .text(0, topY + cfg.levelOffsetY, Data.t('upgrade.card.level_transition', previewModel.currentLevel, previewModel.nextLevel), {
      fontFamily: FONTS.KOREAN,
      fontSize: `${cfg.levelFontSize}px`,
      color: Data.getColorHex(cfg.levelColor),
      stroke: Data.getColorHex(cfg.levelStrokeColor),
      strokeThickness: cfg.levelStrokeThickness,
      resolution: textCfg.resolution,
      align: 'center',
    })
    .setOrigin(0.5, 0);
  container.add(levelText);

  const rows = previewModel.rows.slice(0, cfg.statMaxRows);
  rows.forEach((row, index) => {
    const rowY = topY + cfg.statListStartY + index * cfg.statRowHeight;
    const rowValue = Data.t(
      'upgrade.card.delta_format',
      row.currentDisplay,
      row.nextDisplay,
      row.deltaDisplay
    );
    const valueColor = row.isImprovement
      ? cfg.statIncreaseColor
      : cfg.statDecreaseColor;

    const labelText = scene.add
      .text(-boxWidth / 2 + 18, rowY, row.label, {
        fontFamily: FONTS.KOREAN,
        fontSize: `${cfg.statLabelFontSize}px`,
        color: Data.getColorHex(cfg.statLabelColor),
        resolution: textCfg.resolution,
      })
      .setOrigin(0, 0.5);

    const valueText = scene.add
      .text(boxWidth / 2 - 18, rowY, rowValue, {
        fontFamily: FONTS.KOREAN,
        fontSize: `${cfg.statValueFontSize}px`,
        color: Data.getColorHex(valueColor),
        resolution: textCfg.resolution,
      })
      .setOrigin(1, 0.5);

    container.add(labelText);
    container.add(valueText);
    emphasisTexts.push(valueText);
  });

  const selectionHintKey = `upgrade.${previewModel.upgradeId}.selection_hint`;
  const selectionHintText = Data.t(selectionHintKey);
  if (selectionHintText !== selectionHintKey) {
    const hintFontSize = Math.max(11, cfg.statLabelFontSize - 2);
    const hint = scene.add
      .text(0, 0, selectionHintText, {
        fontFamily: FONTS.KOREAN,
        fontSize: `${hintFontSize}px`,
        color: Data.getColorHex(cfg.statLabelColor),
        resolution: textCfg.resolution,
        align: 'center',
        wordWrap: { width: boxWidth - 36, useAdvancedWrap: true },
      })
      .setOrigin(0.5, 0)
      .setAlpha(0.76);

    const preferredY = topY + cfg.statListStartY + rows.length * cfg.statRowHeight + 8;
    const progressBarTopY = boxHeight / 2 - 45;
    const maxHintY = progressBarTopY - hint.height - 6;
    const minHintY = topY + cfg.statListStartY + 4;
    hint.setY(Math.max(minHintY, Math.min(preferredY, maxHintY)));
    container.add(hint);
  }

  if (previewModel.upgradeId === 'health_pack') {
    const baseSpawnChance = Math.round(Data.healthPack.baseSpawnChance * 100);
    const baseSpawnIntervalSec = Number(
      (Data.healthPack.checkInterval / 1000).toFixed(1).replace(/\.0$/, '')
    );
    const infoY = topY + cfg.statListStartY + rows.length * cfg.statRowHeight + 8;
    const baseInfoText = scene.add
      .text(
        0,
        infoY,
        Data.formatTemplate('upgrade.health_pack.base_info', {
          baseSpawnChance,
          baseSpawnIntervalSec,
        }),
        {
          fontFamily: FONTS.KOREAN,
          fontSize: `${Math.max(12, cfg.statLabelFontSize - 2)}px`,
          color: Data.getColorHex(cfg.statLabelColor),
          resolution: textCfg.resolution,
          align: 'center',
        }
      )
      .setOrigin(0.5, 0);
    container.add(baseInfoText);
  }

  return { emphasisTexts };
}
