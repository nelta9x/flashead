import Phaser from 'phaser';

export interface SpaceshipVisualState {
  size: number;
  currentHp: number;
  maxHp: number;
  hitFlashPhase: number;
  movementTime: number;
  bodyColor: number;
  accentColor: number;
  engineColor: number;
  enginePulseSpeed: number;
}

export class SpaceshipRenderer {
  static render(
    graphics: Phaser.GameObjects.Graphics,
    state: SpaceshipVisualState,
  ): void {
    graphics.clear();

    const { size, movementTime, hitFlashPhase, enginePulseSpeed } = state;
    const flashWhite = hitFlashPhase > 0 ? hitFlashPhase : 0;

    const bodyColor = flashWhite > 0
      ? this.lerpColor(state.bodyColor, 0xffffff, flashWhite)
      : state.bodyColor;
    const accentColor = flashWhite > 0
      ? this.lerpColor(state.accentColor, 0xffffff, flashWhite)
      : state.accentColor;

    // Engine glow (pulsing, behind body)
    const pulse = Math.sin(movementTime * enginePulseSpeed) * 0.3 + 0.7;
    const engineColor = flashWhite > 0
      ? this.lerpColor(state.engineColor, 0xffffff, flashWhite)
      : state.engineColor;
    graphics.fillStyle(engineColor, 0.15 * pulse);
    graphics.fillCircle(0, -size * 0.4, size * 1.2);
    graphics.fillStyle(engineColor, 0.3 * pulse);
    graphics.fillCircle(0, -size * 0.3, size * 0.7);

    // Body: downward-pointing chevron (inverted triangle)
    const halfW = size * 0.7;
    const topY = -size * 0.6;
    const bottomY = size * 0.8;
    const midY = -size * 0.1;

    // Main body fill
    graphics.fillStyle(bodyColor, 0.85);
    graphics.beginPath();
    graphics.moveTo(-halfW, topY);
    graphics.lineTo(0, bottomY);
    graphics.lineTo(halfW, topY);
    graphics.lineTo(0, midY);
    graphics.closePath();
    graphics.fillPath();

    // Body outline
    graphics.lineStyle(2, accentColor, 0.9);
    graphics.beginPath();
    graphics.moveTo(-halfW, topY);
    graphics.lineTo(0, bottomY);
    graphics.lineTo(halfW, topY);
    graphics.lineTo(0, midY);
    graphics.closePath();
    graphics.strokePath();

    // Wing accents
    graphics.lineStyle(1.5, accentColor, 0.6);
    graphics.beginPath();
    graphics.moveTo(-halfW * 0.5, topY + (midY - topY) * 0.3);
    graphics.lineTo(0, midY + (bottomY - midY) * 0.4);
    graphics.moveTo(halfW * 0.5, topY + (midY - topY) * 0.3);
    graphics.lineTo(0, midY + (bottomY - midY) * 0.4);
    graphics.strokePath();

    // Cockpit (circle at front)
    const cockpitY = midY + (bottomY - midY) * 0.2;
    graphics.fillStyle(accentColor, 0.5);
    graphics.fillCircle(0, cockpitY, size * 0.18);
    graphics.lineStyle(1, accentColor, 0.8);
    graphics.strokeCircle(0, cockpitY, size * 0.18);

    // Engine thruster dots at top
    const thrusterY = topY - 2;
    graphics.fillStyle(engineColor, 0.7 * pulse);
    graphics.fillCircle(-halfW * 0.4, thrusterY, 3);
    graphics.fillCircle(halfW * 0.4, thrusterY, 3);

    // HP bar (only when damaged)
    if (state.currentHp < state.maxHp) {
      this.drawHpBar(graphics, size, state.currentHp, state.maxHp);
    }
  }

  private static drawHpBar(
    graphics: Phaser.GameObjects.Graphics,
    size: number,
    currentHp: number,
    maxHp: number,
  ): void {
    const barWidth = size * 1.6;
    const barHeight = 5;
    const barY = -size - 12;

    graphics.fillStyle(0x000000, 0.6);
    graphics.fillRect(-barWidth / 2 - 1, barY - 1, barWidth + 2, barHeight + 2);

    const hpRatio = Math.max(0, currentHp / maxHp);
    const hpColor = this.lerpColor(0xff0000, 0x00ff00, hpRatio);
    graphics.fillStyle(hpColor, 1);
    graphics.fillRect(-barWidth / 2, barY, barWidth * hpRatio, barHeight);

    graphics.lineStyle(1, 0xffffff, 0.5);
    graphics.strokeRect(-barWidth / 2, barY, barWidth, barHeight);
  }

  private static lerpColor(colorA: number, colorB: number, t: number): number {
    const rA = (colorA >> 16) & 0xff;
    const gA = (colorA >> 8) & 0xff;
    const bA = colorA & 0xff;

    const rB = (colorB >> 16) & 0xff;
    const gB = (colorB >> 8) & 0xff;
    const bB = colorB & 0xff;

    const r = Math.round(rA + (rB - rA) * t);
    const g = Math.round(gA + (gB - gA) * t);
    const b = Math.round(bA + (bB - bA) * t);

    return (r << 16) | (g << 8) | b;
  }
}
