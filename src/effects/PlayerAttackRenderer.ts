import Phaser from 'phaser';
import { COLORS } from '../data/constants';

export interface ChargeVisualConfig {
  initialRadius: number;
  maxScale: number;
  glowInitialAlpha: number;
  glowInitialRadius: number;
  glowMaxRadius: number;
  lightningChanceBase: number;
  lightningChanceP: number;
  lightningSegments: number;
  particleFrequency: number;
}

export interface ChargeVisualHandle {
  update(progress: number, x: number, y: number): void;
  destroy(): void;
}

export interface MissileTrailConfig {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  trailWidth: number;
  mainColor: number;
  innerColor: number;
  trailAlpha: number;
  trailLifespan: number;
}

export interface BombWarningConfig {
  duration: number;
  radius: number;
  blinkInterval: number;
}

export class PlayerAttackRenderer {
  private readonly scene: Phaser.Scene;
  private readonly activeGraphics = new Set<Phaser.GameObjects.Graphics>();
  private readonly activeProjectiles = new Set<Phaser.GameObjects.Arc>();
  private readonly activeEmitters = new Set<Phaser.GameObjects.Particles.ParticleEmitter>();
  private readonly activeTimers = new Set<Phaser.Time.TimerEvent>();

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  public createChargeVisual(
    mainColor: number,
    accentColor: number,
    config: ChargeVisualConfig
  ): ChargeVisualHandle {
    const projectile = this.scene.add.circle(0, 0, config.initialRadius, mainColor);
    projectile.setDepth(2000);
    this.activeProjectiles.add(projectile);

    const glow = this.scene.add.graphics();
    glow.setDepth(1999);
    this.activeGraphics.add(glow);

    const chargeParticles = this.scene.add.particles(0, 0, 'particle', {
      speed: { min: -100, max: -300 },
      scale: { start: 0.8, end: 0 },
      lifespan: 400,
      blendMode: 'ADD',
      tint: accentColor,
      emitting: true,
      frequency: config.particleFrequency,
    });
    chargeParticles.setDepth(1998);
    this.activeEmitters.add(chargeParticles);

    const lightning = this.scene.add.graphics();
    lightning.setDepth(2001);
    this.activeGraphics.add(lightning);

    return {
      update: (progress: number, x: number, y: number) => {
        const clampedProgress = Phaser.Math.Clamp(progress, 0, 1);

        projectile.setPosition(x, y);
        projectile.setScale(1 + clampedProgress * (config.maxScale - 1));
        chargeParticles.setPosition(x, y);

        glow.clear();
        glow.fillStyle(mainColor, config.glowInitialAlpha * clampedProgress);
        glow.fillCircle(
          x,
          y,
          config.glowInitialRadius + clampedProgress * (config.glowMaxRadius - config.glowInitialRadius)
        );
        glow.fillStyle(COLORS.WHITE, 0.5 * clampedProgress);
        glow.fillCircle(x, y, 10 + clampedProgress * 20);

        lightning.clear();
        if (
          Math.random() <
          config.lightningChanceBase + clampedProgress * config.lightningChanceP
        ) {
          lightning.lineStyle(2, accentColor, 0.8);
          let lastX = x + (Math.random() - 0.5) * 100 * (1 - clampedProgress / 2);
          let lastY = y + (Math.random() - 0.5) * 100 * (1 - clampedProgress / 2);

          lightning.beginPath();
          lightning.moveTo(lastX, lastY);
          for (let i = 1; i <= config.lightningSegments; i++) {
            const tx = x + (Math.random() - 0.5) * 10 * clampedProgress;
            const ty = y + (Math.random() - 0.5) * 10 * clampedProgress;
            const nextX =
              lastX + (tx - lastX) * (i / config.lightningSegments) + (Math.random() - 0.5) * 20;
            const nextY =
              lastY + (ty - lastY) * (i / config.lightningSegments) + (Math.random() - 0.5) * 20;
            lightning.lineTo(nextX, nextY);
            lastX = nextX;
            lastY = nextY;
          }
          lightning.strokePath();
        }
      },
      destroy: () => {
        projectile.destroy();
        glow.destroy();
        lightning.destroy();
        chargeParticles.destroy();
        this.activeProjectiles.delete(projectile);
        this.activeGraphics.delete(glow);
        this.activeGraphics.delete(lightning);
        this.activeEmitters.delete(chargeParticles);
      },
    };
  }

  public createMissile(
    x: number,
    y: number,
    radius: number,
    color: number,
    depth: number = 2000
  ): Phaser.GameObjects.Arc {
    const missile = this.scene.add.circle(x, y, radius, color);
    missile.setDepth(depth);
    this.activeProjectiles.add(missile);
    return missile;
  }

  public destroyProjectile(projectile: Phaser.GameObjects.Arc): void {
    projectile.destroy();
    this.activeProjectiles.delete(projectile);
  }

  public spawnMissileTrail(config: MissileTrailConfig): void {
    const trail = this.scene.add.graphics();
    trail.setDepth(1997);
    this.activeGraphics.add(trail);

    trail.lineStyle(config.trailWidth, config.mainColor, config.trailAlpha);
    trail.lineBetween(config.fromX, config.fromY, config.toX, config.toY);

    trail.lineStyle(config.trailWidth * 0.4, config.innerColor, config.trailAlpha * 1.5);
    trail.lineBetween(config.fromX, config.fromY, config.toX, config.toY);

    this.scene.tweens.add({
      targets: trail,
      alpha: 0,
      duration: config.trailLifespan,
      onComplete: () => {
        trail.destroy();
        this.activeGraphics.delete(trail);
      },
    });
  }

  public showBombWarning(
    x: number,
    y: number,
    config: BombWarningConfig,
    onComplete: () => void
  ): void {
    const warningGraphics = this.scene.add.graphics();
    warningGraphics.setDepth(500);
    this.activeGraphics.add(warningGraphics);

    let elapsed = 0;
    const updateWarning = () => {
      warningGraphics.clear();

      const blinkPhase = Math.floor(elapsed / config.blinkInterval) % 2;
      const alpha = blinkPhase === 0 ? 0.6 : 0.3;
      const progress = elapsed / config.duration;
      const currentRadius = config.radius * (0.5 + progress * 0.5);

      warningGraphics.fillStyle(COLORS.RED, alpha * 0.3);
      warningGraphics.fillCircle(x, y, currentRadius);

      warningGraphics.lineStyle(3, COLORS.RED, alpha);
      warningGraphics.strokeCircle(x, y, currentRadius);

      const crossSize = currentRadius * 0.5;
      warningGraphics.lineStyle(4, COLORS.RED, alpha);
      warningGraphics.beginPath();
      warningGraphics.moveTo(x - crossSize, y - crossSize);
      warningGraphics.lineTo(x + crossSize, y + crossSize);
      warningGraphics.moveTo(x + crossSize, y - crossSize);
      warningGraphics.lineTo(x - crossSize, y + crossSize);
      warningGraphics.strokePath();
    };

    updateWarning();

    const warningTimer = this.scene.time.addEvent({
      delay: 16,
      callback: () => {
        elapsed += 16;
        if (elapsed < config.duration) {
          updateWarning();
        }
      },
      loop: true,
    });
    this.activeTimers.add(warningTimer);

    this.scene.time.delayedCall(config.duration, () => {
      warningTimer.destroy();
      this.activeTimers.delete(warningTimer);
      warningGraphics.destroy();
      this.activeGraphics.delete(warningGraphics);
      onComplete();
    });
  }

  public destroy(): void {
    this.activeTimers.forEach((timer) => timer.destroy());
    this.activeTimers.clear();

    this.activeGraphics.forEach((graphics) => graphics.destroy());
    this.activeGraphics.clear();

    this.activeProjectiles.forEach((projectile) => projectile.destroy());
    this.activeProjectiles.clear();

    this.activeEmitters.forEach((particles) => particles.destroy());
    this.activeEmitters.clear();
  }
}
