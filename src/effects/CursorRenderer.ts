import Phaser from 'phaser';
import { COLORS } from '../data/constants';
import { Data } from '../data/DataManager';

export class CursorRenderer {
  private graphics: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene) {
    this.graphics = scene.add.graphics();
  }

  /**
   * 메뉴용 원근감 커서 렌더링
   */
  public renderMenuCursor(x: number, y: number, radius: number, perspectiveFactor: number): void {
    this.graphics.clear();

    // 1. 외곽 원 (원근감이 적용된 두께와 크기)
    this.graphics.lineStyle(
      1 + perspectiveFactor * 2,
      Data.gameConfig.player.cursorColorNumeric,
      0.4 + perspectiveFactor * 0.4
    );
    this.graphics.strokeCircle(x, y, radius);

    // 2. 내부 채우기
    this.graphics.fillStyle(
      Data.gameConfig.player.cursorColorNumeric,
      0.1 + perspectiveFactor * 0.2
    );
    this.graphics.fillCircle(x, y, radius);

    // 3. 중앙 점
    this.graphics.fillStyle(COLORS.WHITE, 0.7 + perspectiveFactor * 0.3);
    this.graphics.fillCircle(x, y, 2 * (0.5 + perspectiveFactor * 0.5));
  }

  /**
   * 게임용 공격 범위/게이지 커서 렌더링
   */
  public renderAttackIndicator(
    x: number,
    y: number,
    radius: number,
    gaugeRatio: number,
    magnetRadius: number,
    magnetLevel: number,
    electricLevel: number = 0,
    time: number = 0
  ): void {
    this.graphics.clear();

    // 1. 자기장 범위 원
    if (magnetLevel > 0) {
      this.graphics.lineStyle(1, COLORS.MAGENTA, 0.25);
      this.graphics.strokeCircle(x, y, magnetRadius);
      this.graphics.fillStyle(COLORS.MAGENTA, 0.04);
      this.graphics.fillCircle(x, y, magnetRadius);
    }

    // 2. 전기 충격 효과 (어빌리티 획득 시)
    if (electricLevel > 0) {
      this.drawElectricSparks(x, y, radius, electricLevel, time);
    }

    // 3. 공격 범위 테두리
    const isReady = gaugeRatio >= 1;
    const readyColor = Phaser.Display.Color.HexStringToColor(
      Data.feedback.bossAttack.mainColor
    ).color;
    const baseColor = isReady ? readyColor : Data.gameConfig.player.cursorColorNumeric;

    this.graphics.lineStyle(2, baseColor, 0.8);
    this.graphics.strokeCircle(x, y, radius);

    // 4. 내부 게이지 채우기
    if (gaugeRatio > 0) {
      const fillRadius = radius * gaugeRatio;
      this.graphics.fillStyle(baseColor, isReady ? 0.5 : 0.4);
      this.graphics.fillCircle(x, y, fillRadius);

      if (isReady) {
        // 준비 완료 시 글로우 효과
        this.graphics.lineStyle(4, readyColor, 0.4);
        this.graphics.strokeCircle(x, y, radius + 2);
      }
    }

    // 5. 기본 내부 채우기
    this.graphics.fillStyle(baseColor, 0.15);
    this.graphics.fillCircle(x, y, radius);

    // 6. 중앙 점
    this.graphics.fillStyle(COLORS.WHITE, 1);
    this.graphics.fillCircle(x, y, 2);
  }

  /**
   * 커서 주변에 찌릿찌릿한 전기 스파크 연출
   */
  private drawElectricSparks(
    x: number,
    y: number,
    radius: number,
    level: number,
    time: number
  ): void {
    // 레벨에 따라 스파크 개수와 강도 조절
    const sparkCount = 3 + level * 2;
    const sparkLength = 8 + level * 2;
    const jitter = 5;

    // 시간에 따른 애니메이션 (깜빡임과 위치 변화)
    const seed = Math.floor(time / 50); // 50ms마다 변화

    for (let i = 0; i < sparkCount; i++) {
      // 결정론적 랜덤을 위해 i와 seed 조합
      const angle = ((i / sparkCount) * Math.PI * 2) + (Math.sin(seed + i) * 0.5);
      
      // 스파크의 시작점 (커서 원주 위 또는 약간 밖)
      const startDist = radius + (Math.cos(seed * 1.5 + i) * jitter);
      const startX = x + Math.cos(angle) * startDist;
      const startY = y + Math.sin(angle) * startDist;

      // 스파크의 끝점 (지그재그)
      const midAngle = angle + (Math.random() - 0.5) * 0.5;
      const midX = startX + Math.cos(midAngle) * (sparkLength * 0.5);
      const midY = startY + Math.sin(midAngle) * (sparkLength * 0.5);

      const endAngle = midAngle + (Math.random() - 0.5) * 0.8;
      const endX = midX + Math.cos(endAngle) * (sparkLength * 0.5);
      const endY = midY + Math.sin(endAngle) * (sparkLength * 0.5);

      // 그리기
      const alpha = 0.4 + Math.random() * 0.6;
      this.graphics.lineStyle(2, COLORS.CYAN, alpha);
      this.graphics.beginPath();
      this.graphics.moveTo(startX, startY);
      this.graphics.lineTo(midX, midY);
      this.graphics.lineTo(endX, endY);
      this.graphics.strokePath();

      // 끝점에 작은 점 추가 (빛나는 효과)
      if (Math.random() > 0.5) {
        this.graphics.fillStyle(COLORS.WHITE, alpha);
        this.graphics.fillCircle(endX, endY, 1.5);
      }
    }

    // 글로우 효과 (전체적인 푸른 빛)
    this.graphics.fillStyle(COLORS.CYAN, 0.05 + (Math.sin(time / 100) + 1) * 0.05);
    this.graphics.fillCircle(x, y, radius + 10);
  }

  public setDepth(depth: number): void {
    this.graphics.setDepth(depth);
  }

  public destroy(): void {
    this.graphics.destroy();
  }
}
