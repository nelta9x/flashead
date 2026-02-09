import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../data/constants';
import type { ShootingStarConfig, StarsConfig } from '../data/types';

interface StarData {
  x: number;
  y: number;
  size: number;
  twinkleSpeed: number;
  offset: number;
}

interface ShootingStarData {
  x: number;
  y: number;
  vx: number;
  vy: number;
  directionX: number;
  directionY: number;
  length: number;
  lineWidth: number;
  color: number;
  alpha: number;
  headGlowIntensity: number;
  lifetime: number;
  age: number;
}

export class StarBackground {
  private graphics: Phaser.GameObjects.Graphics;
  private config: StarsConfig;
  private stars: StarData[] = [];
  private shootingStars: ShootingStarData[] = [];
  private shootingStarColor: number = COLORS.CYAN;
  private nextBurstInMs: number = 0;
  private burstSpawnDelayMs: number = 0;
  private burstRemainingCount: number = 0;

  constructor(scene: Phaser.Scene, config: StarsConfig) {
    this.config = config;
    this.graphics = scene.add.graphics();
    this.init();
    this.initShootingStarState();
  }

  private init(): void {
    this.stars = [];
    const limitY = GAME_HEIGHT * this.config.verticalLimitRatio;

    for (let i = 0; i < this.config.count; i++) {
      this.stars.push({
        x: Math.random() * GAME_WIDTH,
        y: Math.random() * limitY,
        size: Phaser.Math.FloatBetween(this.config.minSize, this.config.maxSize),
        twinkleSpeed: Phaser.Math.FloatBetween(
          this.config.twinkleSpeedMin,
          this.config.twinkleSpeedMax
        ),
        offset: Math.random() * Math.PI * 2,
      });
    }
  }

  public update(delta: number, time: number, gridSpeed: number): void {
    const limitY = GAME_HEIGHT * this.config.verticalLimitRatio;
    this.graphics.clear();

    this.stars.forEach((star) => {
      // 1. 반짝임 (Alpha)
      const alpha = 0.2 + Math.abs(Math.sin(time * star.twinkleSpeed + star.offset)) * 0.8;

      // 2. 아래로 이동 (그리드보다 10배 느리게 흐름)
      // 원근감을 위해 크기에 비례하여 속도 조절
      const sizeFactor = star.size / this.config.maxSize;
      const baseRatio = this.config.parallaxRatio;
      const variation = this.config.sizeSpeedFactor;

      // 공식: gridSpeed * 기본비율 * (1 - variation/2 + sizeFactor * variation)
      // 예: 0.1 * (0.8 + sizeFactor * 0.4) 와 비슷하게 동작하도록 설정
      const parallaxSpeed = gridSpeed * baseRatio * (1 - variation * 0.5 + sizeFactor * variation);

      star.y += parallaxSpeed * delta;

      // 경계 체크 및 리셋
      if (star.y > limitY) {
        star.y = 0;
        star.x = Math.random() * GAME_WIDTH;
      }

      // 3. 그리기
      this.graphics.fillStyle(0xffffff, alpha);
      this.graphics.fillCircle(star.x, star.y, star.size);

      // 큰 별은 가끔 Cyan 빛 테두리 추가
      if (star.size > 1.5) {
        this.graphics.lineStyle(1, COLORS.CYAN, alpha * 0.4);
        this.graphics.strokeCircle(star.x, star.y, star.size + 1);
      }
    });

    this.updateShootingStars(delta, limitY);
  }

  public setDepth(depth: number): void {
    this.graphics.setDepth(depth);
  }

  public destroy(): void {
    this.graphics.destroy();
  }

  private initShootingStarState(): void {
    const shootingStarConfig = this.config.shootingStar;

    this.shootingStars = [];
    this.nextBurstInMs = 0;
    this.burstSpawnDelayMs = 0;
    this.burstRemainingCount = 0;

    if (!shootingStarConfig?.enabled) return;

    this.shootingStarColor = this.parseHexColor(shootingStarConfig.color);
    this.nextBurstInMs = this.randomFloat(
      shootingStarConfig.cycleIntervalMs.min,
      shootingStarConfig.cycleIntervalMs.max
    );
  }

  private updateShootingStars(delta: number, limitY: number): void {
    const shootingStarConfig = this.config.shootingStar;
    if (!shootingStarConfig?.enabled) return;

    if (this.burstRemainingCount > 0) {
      this.burstSpawnDelayMs -= delta;

      while (this.burstRemainingCount > 0 && this.burstSpawnDelayMs <= 0) {
        this.spawnShootingStar(shootingStarConfig, limitY);
        this.burstRemainingCount--;

        if (this.burstRemainingCount > 0) {
          this.burstSpawnDelayMs += this.randomFloat(
            shootingStarConfig.spawnDelayMs.min,
            shootingStarConfig.spawnDelayMs.max
          );
        }
      }
    } else {
      this.nextBurstInMs -= delta;
      if (this.nextBurstInMs <= 0) {
        this.startShootingStarBurst(shootingStarConfig);
      }
    }

    const deltaSeconds = delta / 1000;

    for (let i = this.shootingStars.length - 1; i >= 0; i--) {
      const shootingStar = this.shootingStars[i];
      shootingStar.age += delta;

      if (shootingStar.age >= shootingStar.lifetime) {
        this.shootingStars.splice(i, 1);
        continue;
      }

      shootingStar.x += shootingStar.vx * deltaSeconds;
      shootingStar.y += shootingStar.vy * deltaSeconds;

      const outOfBounds =
        shootingStar.x < -shootingStarConfig.startXPadding * 2 ||
        shootingStar.x > GAME_WIDTH + shootingStarConfig.startXPadding * 2 ||
        shootingStar.y > GAME_HEIGHT + shootingStarConfig.startXPadding;

      if (outOfBounds) {
        this.shootingStars.splice(i, 1);
        continue;
      }

      const progress = shootingStar.age / shootingStar.lifetime;
      const fadeAlpha = 1 - progress;
      const bodyAlpha = shootingStar.alpha * fadeAlpha;
      const tailAlpha = bodyAlpha * shootingStarConfig.tailAlphaScale;
      const headGlowIntensity = Phaser.Math.Clamp(shootingStar.headGlowIntensity, 0, 1);

      const tailX = shootingStar.x - shootingStar.directionX * shootingStar.length;
      const tailY = shootingStar.y - shootingStar.directionY * shootingStar.length;

      this.graphics.lineStyle(
        shootingStar.lineWidth * 2,
        shootingStar.color,
        tailAlpha * shootingStarConfig.glowAlphaScale
      );
      this.graphics.beginPath();
      this.graphics.moveTo(shootingStar.x, shootingStar.y);
      this.graphics.lineTo(tailX, tailY);
      this.graphics.strokePath();

      this.graphics.lineStyle(shootingStar.lineWidth, shootingStar.color, bodyAlpha);
      this.graphics.beginPath();
      this.graphics.moveTo(shootingStar.x, shootingStar.y);
      this.graphics.lineTo(tailX, tailY);
      this.graphics.strokePath();

      const headRadius = shootingStar.lineWidth * shootingStarConfig.glowRadiusScale;

      // Head glow: brighter layered bloom so the meteor head pops more.
      this.graphics.fillStyle(
        shootingStar.color,
        bodyAlpha * shootingStarConfig.glowAlphaScale * 0.5 * headGlowIntensity
      );
      this.graphics.fillCircle(shootingStar.x, shootingStar.y, headRadius * 2.2);

      this.graphics.fillStyle(shootingStar.color, bodyAlpha * 0.75 * headGlowIntensity);
      this.graphics.fillCircle(shootingStar.x, shootingStar.y, headRadius * 1.15);

      this.graphics.fillStyle(0xffffff, bodyAlpha * 0.5 * headGlowIntensity);
      this.graphics.fillCircle(shootingStar.x, shootingStar.y, headRadius * 0.55);
    }
  }

  private startShootingStarBurst(config: ShootingStarConfig): void {
    this.burstRemainingCount = this.randomInt(config.burstCount.min, config.burstCount.max);
    this.burstSpawnDelayMs = 0;
    this.nextBurstInMs = this.randomFloat(config.cycleIntervalMs.min, config.cycleIntervalMs.max);
  }

  private spawnShootingStar(config: ShootingStarConfig, limitY: number): void {
    const spawnFromLeft = Math.random() < 0.5;
    const startX = spawnFromLeft ? -config.startXPadding : GAME_WIDTH + config.startXPadding;
    const startY = this.randomFloat(0, limitY * config.startYMaxRatio);

    const angleDeg = this.randomFloat(config.angleDeg.min, config.angleDeg.max);
    const directionDeg = spawnFromLeft ? angleDeg : 180 - angleDeg;
    const angleRad = Phaser.Math.DegToRad(directionDeg);

    const directionX = Math.cos(angleRad);
    const directionY = Math.sin(angleRad);
    const speed = this.randomFloat(config.speed.min, config.speed.max);
    const travelDistance = this.randomFloat(config.travelDistance.min, config.travelDistance.max);
    const headGlowIntensity = this.randomFloat(
      config.headGlowIntensity.min,
      config.headGlowIntensity.max
    );

    this.shootingStars.push({
      x: startX,
      y: startY,
      vx: directionX * speed,
      vy: directionY * speed,
      directionX,
      directionY,
      length: this.randomFloat(config.length.min, config.length.max),
      lineWidth: this.randomFloat(config.lineWidth.min, config.lineWidth.max),
      color: this.rollShootingStarColor(config),
      alpha: this.randomFloat(config.alpha.min, config.alpha.max),
      headGlowIntensity,
      lifetime: (travelDistance / speed) * 1000,
      age: 0,
    });
  }

  private randomFloat(min: number, max: number): number {
    return Phaser.Math.FloatBetween(min, max);
  }

  private randomInt(min: number, max: number): number {
    const start = Math.round(Math.min(min, max));
    const end = Math.round(Math.max(min, max));
    return Phaser.Math.Between(start, end);
  }

  private rollShootingStarColor(config: ShootingStarConfig): number {
    const palette = config.colorPalette;
    if (!Array.isArray(palette) || palette.length === 0) {
      return this.shootingStarColor;
    }

    const index = Phaser.Math.Between(0, palette.length - 1);
    return this.parseHexColor(palette[index]);
  }

  private parseHexColor(hex: string): number {
    const parsed = parseInt(hex.replace('#', ''), 16);
    return Number.isNaN(parsed) ? COLORS.CYAN : parsed;
  }
}
