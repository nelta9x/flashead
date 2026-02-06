import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS, COLORS_HEX, UPGRADE_UI, FONTS } from '../data/constants';
import { UpgradeSystem, Upgrade } from '../systems/UpgradeSystem';
import { EventBus, GameEvents } from '../utils/EventBus';

interface UpgradeBox {
  container: Phaser.GameObjects.Container;
  upgrade: Upgrade;
  hoverProgress: number;
  isHovered: boolean;
  progressBar: Phaser.GameObjects.Graphics;
  bg: Phaser.GameObjects.Graphics;
  borderColor: number;
}

export class InGameUpgradeUI {
  private scene: Phaser.Scene;
  private upgradeSystem: UpgradeSystem;
  private boxes: UpgradeBox[] = [];
  private visible: boolean = false;
  private mainContainer!: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene, upgradeSystem: UpgradeSystem) {
    this.scene = scene;
    this.upgradeSystem = upgradeSystem;
    this.createContainer();
  }

  private createContainer(): void {
    this.mainContainer = this.scene.add.container(0, 0);
    this.mainContainer.setDepth(900);
    this.mainContainer.setVisible(false);
  }

  show(): void {
    if (this.visible) return;

    this.visible = true;
    this.clearBoxes();

    const upgrades = this.upgradeSystem.getRandomUpgrades(3);
    this.createUpgradeBoxes(upgrades);

    this.mainContainer.setVisible(true);
    this.mainContainer.setAlpha(0);

    this.scene.tweens.add({
      targets: this.mainContainer,
      alpha: 1,
      duration: 200,
      ease: 'Power2',
    });
  }

  hide(): void {
    if (!this.visible) return;

    this.visible = false;
    this.hideWithAnimation();
  }

  private hideWithAnimation(): void {
    this.scene.tweens.add({
      targets: this.mainContainer,
      alpha: 0,
      duration: 150,
      ease: 'Power2',
      onComplete: () => {
        this.mainContainer.setVisible(false);
        this.clearBoxes();
      },
    });
  }

  private clearBoxes(): void {
    this.boxes.forEach((box) => {
      box.container.destroy();
    });
    this.boxes = [];
  }

  private createUpgradeBoxes(upgrades: Upgrade[]): void {
    const { BOX_WIDTH, BOX_SPACING, BOX_Y_OFFSET } = UPGRADE_UI;
    const totalWidth = upgrades.length * BOX_WIDTH + (upgrades.length - 1) * BOX_SPACING;
    const startX = (GAME_WIDTH - totalWidth) / 2 + BOX_WIDTH / 2;
    const y = GAME_HEIGHT - BOX_Y_OFFSET;

    upgrades.forEach((upgrade, index) => {
      const x = startX + index * (BOX_WIDTH + BOX_SPACING);
      const box = this.createUpgradeBox(upgrade, x, y);
      this.boxes.push(box);
    });
  }

  private createUpgradeBox(upgrade: Upgrade, x: number, y: number): UpgradeBox {
    const { BOX_WIDTH, BOX_HEIGHT } = UPGRADE_UI;
    const container = this.scene.add.container(x, y);
    this.mainContainer.add(container);

    const rarityColors: Record<string, number> = {
      common: COLORS.WHITE,
      rare: COLORS.CYAN,
      epic: COLORS.MAGENTA,
      legendary: COLORS.YELLOW,
    };
    const borderColor = rarityColors[upgrade.rarity] || COLORS.WHITE;

    // 배경
    const bg = this.scene.add.graphics();
    this.drawBoxBackground(bg, BOX_WIDTH, BOX_HEIGHT, borderColor, false);
    container.add(bg);

    // 아이콘 그래픽
    const iconGraphics = this.scene.add.graphics();
    const iconY = -BOX_HEIGHT / 2 + 32;
    iconGraphics.setPosition(0, iconY);
    container.add(iconGraphics);

    const hasCustomIcon = this.drawUpgradeIcon(iconGraphics, upgrade.id, borderColor);

    // 아이콘 (커스텀 아이콘이 없는 경우 텍스트 심볼 사용)
    if (!hasCustomIcon) {
      const iconSymbol = this.getUpgradeSymbol(upgrade.id);
      const icon = this.scene.add
        .text(0, iconY, iconSymbol, {
          fontFamily: FONTS.MAIN,
          fontSize: '32px',
          color: `#${borderColor.toString(16).padStart(6, '0')}`,
        })
        .setOrigin(0.5);
      container.add(icon);
    }

    // 이름
    const name = this.scene.add
      .text(0, -BOX_HEIGHT / 2 + 58, upgrade.name, {
        fontFamily: FONTS.KOREAN,
        fontSize: '14px',
        color: COLORS_HEX.WHITE,
        wordWrap: { width: BOX_WIDTH - 20 },
        align: 'center',
      })
      .setOrigin(0.5);
    container.add(name);

    // 효과 미리보기 설명
    const previewDesc = this.upgradeSystem.getPreviewDescription(upgrade.id);
    const descText = this.scene.add
      .text(0, -BOX_HEIGHT / 2 + 88, previewDesc, {
        fontFamily: FONTS.KOREAN,
        fontSize: '12px',
        color: '#cccccc',
        wordWrap: { width: BOX_WIDTH - 24 },
        align: 'center',
      })
      .setOrigin(0.5, 0);
    container.add(descText);

    // 진행바 배경
    const progressBarBg = this.scene.add.graphics();
    const barWidth = BOX_WIDTH - 40;
    const barHeight = 6;
    const barY = BOX_HEIGHT / 2 - 15;
    progressBarBg.fillStyle(0x333333, 0.8);
    progressBarBg.fillRoundedRect(-barWidth / 2, barY - barHeight / 2, barWidth, barHeight, 3);
    container.add(progressBarBg);

    // 진행바
    const progressBar = this.scene.add.graphics();
    container.add(progressBar);

    return {
      container,
      upgrade,
      hoverProgress: 0,
      isHovered: false,
      progressBar,
      bg,
      borderColor,
    };
  }

  private drawUpgradeIcon(
    graphics: Phaser.GameObjects.Graphics,
    upgradeId: string,
    color: number
  ): boolean {
    graphics.clear();

    switch (upgradeId) {
      case 'cursor_size':
        // 타겟 아이콘 + 확장 화살표 (네온 스타일)
        // 외곽 글로우
        graphics.lineStyle(4, color, 0.3);
        graphics.strokeCircle(0, 0, 10);
        // 메인 라인
        graphics.lineStyle(2, color, 1);
        graphics.strokeCircle(0, 0, 10);
        graphics.strokeCircle(0, 0, 2);

        // 확장 화살표들
        const arrows = [
          { x: 0, y: -1, dx: 0, dy: -1 }, // 위
          { x: 0, y: 1, dx: 0, dy: 1 },  // 아래
          { x: -1, y: 0, dx: -1, dy: 0 }, // 왼쪽
          { x: 1, y: 0, dx: 1, dy: 0 }   // 오른쪽
        ];

        arrows.forEach(a => {
          const start = 14;
          const end = 22;
          // 글로우
          graphics.lineStyle(4, color, 0.3);
          graphics.lineBetween(a.x * start, a.y * start, a.x * end, a.y * end);
          // 메인
          graphics.lineStyle(2, color, 1);
          graphics.lineBetween(a.x * start, a.y * start, a.x * end, a.y * end);
          // 화살표 머리
          graphics.beginPath();
          graphics.moveTo(a.x * end, a.y * end);
          if (a.dx === 0) {
            graphics.lineTo(a.x * end - 4, a.y * end + a.dy * 4);
            graphics.lineTo(a.x * end + 4, a.y * end + a.dy * 4);
          } else {
            graphics.lineTo(a.x * end + a.dx * 4, a.y * end - 4);
            graphics.lineTo(a.x * end + a.dx * 4, a.y * end + 4);
          }
          graphics.closePath();
          graphics.fillPath();
        });
        return true;

      case 'electric_shock':
        // 번개 아이콘 (이중 레이어 네온)
        // 글로우
        graphics.lineStyle(6, color, 0.2);
        this.drawLightningPath(graphics);
        graphics.strokePath();
        // 메인
        graphics.fillStyle(color, 1);
        this.drawLightningPath(graphics);
        graphics.fillPath();
        graphics.lineStyle(1, 0xffffff, 0.5);
        graphics.strokePath();
        return true;

      case 'static_discharge':
        // 중앙 코어와 퍼지는 전기 스파크
        graphics.fillStyle(color, 0.3);
        graphics.fillCircle(0, 0, 8);
        graphics.fillStyle(0xffffff, 1);
        graphics.fillCircle(0, 0, 3);

        for (let i = 0; i < 6; i++) {
          const angle = (i * Math.PI * 2) / 6;
          graphics.lineStyle(2, color, 1);
          graphics.beginPath();
          graphics.moveTo(0, 0);
          
          let curX = 0;
          let curY = 0;
          for (let j = 0; j < 3; j++) {
            const segmentLen = 6 + Math.random() * 6;
            const segmentAngle = angle + (Math.random() - 0.5) * 0.8;
            curX += Math.cos(segmentAngle) * segmentLen;
            curY += Math.sin(segmentAngle) * segmentLen;
            graphics.lineTo(curX, curY);
          }
          graphics.strokePath();
          // 끝점 스파크
          graphics.fillStyle(0xffffff, 0.8);
          graphics.fillCircle(curX, curY, 2);
        }
        return true;

      case 'magnet':
        // U자형 자석 (입체감 있는 네온)
        const magnetPath = (g: Phaser.GameObjects.Graphics) => {
          g.beginPath();
          g.arc(0, 5, 15, 0, Math.PI, false);
          g.lineTo(-15, -10);
          g.lineTo(-7, -10);
          g.lineTo(-7, 5);
          g.arc(0, 5, 7, Math.PI, 0, true);
          g.lineTo(7, -10);
          g.lineTo(15, -10);
          g.closePath();
        };

        // 글로우
        graphics.lineStyle(4, color, 0.3);
        magnetPath(graphics);
        graphics.strokePath();
        // 몸체
        graphics.fillStyle(color, 0.8);
        magnetPath(graphics);
        graphics.fillPath();
        // 팁 (극성 표시)
        graphics.fillStyle(0xffffff, 0.9);
        graphics.fillRect(-15, -10, 8, 5);
        graphics.fillRect(7, -10, 8, 5);
        return true;

      case 'missile':
        // 미사일 (더 정교한 모양)
        const drawMissile = (g: Phaser.GameObjects.Graphics) => {
          g.beginPath();
          g.moveTo(0, -22); // 코즈
          g.bezierCurveTo(8, -15, 8, 5, 6, 12); // 오른쪽 몸통
          g.lineTo(-6, 12); // 바닥
          g.bezierCurveTo(-8, 5, -8, -15, 0, -22); // 왼쪽 몸통
          g.closePath();
        };

        // 글로우
        graphics.lineStyle(4, color, 0.3);
        drawMissile(graphics);
        graphics.strokePath();
        // 몸체
        graphics.fillStyle(color, 1);
        drawMissile(graphics);
        graphics.fillPath();
        // 날개
        graphics.beginPath();
        graphics.moveTo(-6, 2);
        graphics.lineTo(-12, 10);
        graphics.lineTo(-6, 10);
        graphics.moveTo(6, 2);
        graphics.lineTo(12, 10);
        graphics.lineTo(6, 10);
        graphics.fillPath();
        // 엔진 불꽃
        graphics.fillStyle(0xffaa00, 0.8);
        graphics.fillCircle(0, 15, 4);
        return true;

      case 'health_pack':
        // 하트 + 십자가 (부드러운 네온)
        // 하트 외곽선 글로우
        graphics.lineStyle(4, color, 0.3);
        this.drawHeartPath(graphics, 16);
        graphics.strokePath();
        // 하트 채우기
        graphics.fillStyle(color, 0.2);
        this.drawHeartPath(graphics, 16);
        graphics.fillPath();
        // 중앙 십자가
        graphics.lineStyle(4, 0xffffff, 1);
        graphics.lineBetween(-7, 0, 7, 0);
        graphics.lineBetween(0, -7, 0, 7);
        return true;

      default:
        return false;
    }
  }

  private drawLightningPath(g: Phaser.GameObjects.Graphics): void {
    g.beginPath();
    g.moveTo(6, -20);
    g.lineTo(-8, 2);
    g.lineTo(0, 2);
    g.lineTo(-6, 20);
    g.lineTo(8, -2);
    g.lineTo(0, -2);
    g.closePath();
  }

  private drawHeartPath(g: Phaser.GameObjects.Graphics, size: number): void {
    g.beginPath();
    g.moveTo(0, size * 0.7);
    g.cubicCurveTo(-size, size * 0.1, -size, -size * 0.7, 0, -size * 0.4);
    g.cubicCurveTo(size, -size * 0.7, size, size * 0.1, 0, size * 0.7);
    g.closePath();
  }

  private drawBoxBackground(
    graphics: Phaser.GameObjects.Graphics,
    width: number,
    height: number,
    borderColor: number,
    hovered: boolean
  ): void {
    graphics.clear();
    graphics.fillStyle(hovered ? 0x2a1a4e : 0x1a0a2e, 0.95);
    graphics.fillRoundedRect(-width / 2, -height / 2, width, height, 10);
    graphics.lineStyle(hovered ? 3 : 2, borderColor, hovered ? 1 : 0.7);
    graphics.strokeRoundedRect(-width / 2, -height / 2, width, height, 10);
  }

  private updateProgressBar(box: UpgradeBox): void {
    const { BOX_WIDTH, BOX_HEIGHT, HOVER_DURATION } = UPGRADE_UI;
    const barWidth = BOX_WIDTH - 40;
    const barHeight = 6;
    const barY = BOX_HEIGHT / 2 - 15;

    box.progressBar.clear();

    if (box.hoverProgress > 0) {
      const fillWidth = barWidth * (box.hoverProgress / HOVER_DURATION);
      box.progressBar.fillStyle(box.borderColor, 1);
      box.progressBar.fillRoundedRect(-barWidth / 2, barY - barHeight / 2, fillWidth, barHeight, 3);
    }
  }

  private getUpgradeSymbol(upgradeId: string): string {
    const symbols: Record<string, string> = {
      damage_up: '⚔',
      attack_speed: '⚡',
      dish_slow: '⏱',
      hp_up: '♥',
      heal_on_wave: '✚',
      aoe_destroy: '◎',
      bomb_shield: '🛡',
      lifesteal: '♡',
      combo_heal: '❤',
      health_pack: '✚',
      cursor_size: '◯',
      critical_chance: '✦',
      aoe_destroy_enhanced: '◉',
      freeze_aura: '❄',
      electric_shock: '⚡',
      bomb_convert: '↻',
      second_chance: '↺',
      magnet_pull: '⊕',
      chain_reaction: '⁂',
      black_hole: '●',
      immortal: '∞',
      time_stop: '⏸',
      auto_destroy: '⟳',
    };
    return symbols[upgradeId] || '★';
  }

  update(delta: number): void {
    if (!this.visible) return;

    const pointer = this.scene.input.activePointer;
    const { BOX_WIDTH, BOX_HEIGHT, HOVER_DURATION } = UPGRADE_UI;

    for (const box of this.boxes) {
      const bounds = new Phaser.Geom.Rectangle(
        box.container.x - BOX_WIDTH / 2,
        box.container.y - BOX_HEIGHT / 2,
        BOX_WIDTH,
        BOX_HEIGHT
      );

      const wasHovered = box.isHovered;
      box.isHovered = bounds.contains(pointer.worldX, pointer.worldY);

      // 호버 상태 변경 시 배경 업데이트
      if (wasHovered !== box.isHovered) {
        this.drawBoxBackground(box.bg, BOX_WIDTH, BOX_HEIGHT, box.borderColor, box.isHovered);
        if (box.isHovered) {
          box.container.setScale(1.05);
        } else {
          box.container.setScale(1);
        }
      }

      if (box.isHovered) {
        // 호버 중: 진행바 증가
        box.hoverProgress += delta;

        if (box.hoverProgress >= HOVER_DURATION) {
          // 선택 완료
          this.selectUpgrade(box.upgrade);
          return;
        }
      } else {
        // 호버 해제: 진행바 빠르게 감소
        box.hoverProgress = Math.max(0, box.hoverProgress - delta * 3);
      }

      this.updateProgressBar(box);
    }
  }

  private selectUpgrade(upgrade: Upgrade): void {
    // 이미 숨김 처리 중이면 무시 (중복 호출 방지)
    if (!this.visible) return;

    // 즉시 visible을 false로 설정하여 중복 호출 방지
    this.visible = false;

    // 업그레이드 적용
    this.upgradeSystem.applyUpgrade(upgrade);

    // UI 숨김 애니메이션
    this.hideWithAnimation();

    this.scene.time.delayedCall(150, () => {
      EventBus.getInstance().emit(GameEvents.UPGRADE_SELECTED, upgrade);
    });
  }

  isVisible(): boolean {
    return this.visible;
  }

  getBlockedYArea(): number {
    // UI 표시 중 접시 스폰을 피해야 할 Y 영역의 상단 경계
    if (!this.visible) return GAME_HEIGHT;
    return GAME_HEIGHT - UPGRADE_UI.BOX_Y_OFFSET - UPGRADE_UI.BOX_HEIGHT / 2 - 30;
  }

  destroy(): void {
    this.clearBoxes();
    this.mainContainer.destroy();
  }
}
