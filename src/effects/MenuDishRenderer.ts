import Phaser from 'phaser';

export class MenuDishRenderer {
  public static renderDish(
    graphics: Phaser.GameObjects.Graphics,
    radius: number,
    color: number
  ): void {
    graphics.clear();
    graphics.lineStyle(2, color, 1);
    graphics.fillStyle(color, 0.3);

    graphics.beginPath();
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const px = Math.cos(angle) * radius;
      const py = Math.sin(angle) * radius;
      if (i === 0) graphics.moveTo(px, py);
      else graphics.lineTo(px, py);
    }
    graphics.closePath();
    graphics.fillPath();
    graphics.strokePath();
  }
}
