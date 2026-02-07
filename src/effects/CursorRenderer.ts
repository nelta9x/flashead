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
    // 레벨에 따라 스파크 개수 조절
    const sparkCount = 2 + level;
    const jitter = 5;

    // 시간에 따른 애니메이션 (50ms마다 변화하여 지지직거리는 느낌)
    const seed = Math.floor(time / 50);

    for (let i = 0; i < sparkCount; i++) {
      // 결정론적 각도 (i와 seed를 사용하여 매 프레임 위치가 변하도록 함)
      const angle = ((i / sparkCount) * Math.PI * 2) + (Math.sin(seed * 1.5 + i) * 0.8);
      
      // 중심(x, y)에서 시작하여 원주 근처까지 뻗는 지그재그 줄기
      const targetDist = radius + (Math.cos(seed * 2 + i) * jitter);
      const segments = 3;
      
      const alpha = 0.4 + (Math.sin(time / 40 + i) * 0.3);
      this.graphics.lineStyle(1.5, COLORS.CYAN, alpha);
      this.graphics.beginPath();
      this.graphics.moveTo(x, y);

      let lastX = x;
      let lastY = y;

      for (let s = 1; s <= segments; s++) {
        const progress = s / segments;
        const dist = progress * targetDist;
        
        // 지그재그 효과를 위해 각도에 오프셋 추가
        const offset = s === segments ? 0 : (Math.sin(seed * 5 + i * 2 + s) * 0.4);
        const sx = x + Math.cos(angle + offset) * dist;
        const sy = y + Math.sin(angle + offset) * dist;

        this.graphics.lineTo(sx, sy);
        lastX = sx;
        lastY = sy;
      }
      
      this.graphics.strokePath();

      // 끝점 및 중간 굴절 포인트에 작은 빛 추가
      if ((seed + i) % 2 === 0) {
        this.graphics.fillStyle(COLORS.WHITE, alpha * 0.8);
        this.graphics.fillCircle(lastX, lastY, 1.2);
      }
    }

    // 전체적인 푸른 글로우 효과
    const glowAlpha = 0.04 + (Math.sin(time / 100) + 1) * 0.03;
    this.graphics.fillStyle(COLORS.CYAN, glowAlpha);
    this.graphics.fillCircle(x, y, radius + 10);
  }

  public setDepth(depth: number): void {
    this.graphics.setDepth(depth);
  }

  public destroy(): void {
    this.graphics.destroy();
  }
}
