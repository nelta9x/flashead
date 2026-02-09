import Phaser from 'phaser';
import { Dish } from '../entities/Dish';
import { UpgradeSystem } from './UpgradeSystem';
import { ObjectPool } from '../utils/ObjectPool';
import type { SystemUpgradeData } from '../data/types';
import type { BossRadiusSnapshot } from '../scenes/game/GameSceneContracts';

export interface OrbPosition {
  x: number;
  y: number;
  size: number;
}

interface OrbOverclockConfig {
  durationMs: number;
  speedMultiplier: number;
  maxStacks: number;
}

export class OrbSystem {
  private upgradeSystem: UpgradeSystem;
  private currentAngle: number = 0;

  // Cooldown tracking per dish: Map<Dish, NextHitTime>
  private lastHitTimes: WeakMap<Dish, number> = new WeakMap();
  private bossLastHitTimes: Map<string, number> = new Map();

  private orbPositions: OrbPosition[] = [];
  private overclockStacks: number = 0;
  private overclockExpireAt: number = 0;

  constructor(upgradeSystem: UpgradeSystem) {
    this.upgradeSystem = upgradeSystem;
  }

  update(
    delta: number,
    gameTime: number,
    playerX: number,
    playerY: number,
    dishPool: ObjectPool<Dish>,
    getBossSnapshots: () => BossRadiusSnapshot[] = () => [],
    onBossDamage: (bossId: string, damage: number, x: number, y: number) => void = () => {}
  ): void {
    const level = this.upgradeSystem.getOrbitingOrbLevel();
    if (level <= 0) {
      this.orbPositions = [];
      this.resetOverclock();
      return;
    }

    const upgradeData = this.upgradeSystem.getSystemUpgrade('orbiting_orb');
    const hitInterval = upgradeData?.hitInterval ?? 300;
    const overclockConfig = this.resolveOverclockConfig(upgradeData);
    this.updateOverclockState(gameTime, overclockConfig);

    const stats = this.upgradeSystem.getOrbitingOrbData();
    if (!stats) return;
    const criticalChanceBonus = this.upgradeSystem.getCriticalChanceBonus();

    // Magnet Synergy: Increase Size
    const magnetLevel = this.upgradeSystem.getMagnetLevel();
    // Base size + 20% per magnet level
    const synergySizeMultiplier = 1 + magnetLevel * 0.2;
    const finalSize = stats.size * synergySizeMultiplier;

    // Update Angle
    // Speed is in degrees per second
    const speed = stats.speed * this.getOverclockSpeedMultiplier(overclockConfig);
    this.currentAngle += speed * (delta / 1000);
    this.currentAngle %= 360;

    // Calculate Positions
    this.orbPositions = [];
    const count = stats.count;
    const radius = stats.radius;
    const angleStep = 360 / count;

    for (let i = 0; i < count; i++) {
      const angleDeg = this.currentAngle + i * angleStep;
      const angleRad = Phaser.Math.DegToRad(angleDeg);

      const orbX = playerX + Math.cos(angleRad) * radius;
      const orbY = playerY + Math.sin(angleRad) * radius;

      this.orbPositions.push({
        x: orbX,
        y: orbY,
        size: finalSize,
      });
    }

    // Check Collisions
    this.checkCollisions(
      gameTime,
      dishPool,
      stats.damage,
      finalSize,
      hitInterval,
      criticalChanceBonus,
      overclockConfig,
      getBossSnapshots,
      onBossDamage
    );
  }

  private checkCollisions(
    gameTime: number,
    dishPool: ObjectPool<Dish>,
    damage: number,
    orbSize: number,
    hitInterval: number,
    criticalChanceBonus: number,
    overclockConfig: OrbOverclockConfig,
    getBossSnapshots: () => BossRadiusSnapshot[],
    onBossDamage: (bossId: string, damage: number, x: number, y: number) => void
  ): void {
    dishPool.forEach((dish) => {
      if (!dish.active) return;

      // 폭탄(dangerous)은 완전히 스폰된 후에만 타격 가능
      if (dish.isDangerous() && !dish.isFullySpawned()) return;

      // Collision Check (Circle vs Circle)
      // Iterate all orbs
      let hit = false;
      for (const orb of this.orbPositions) {
        const dist = Phaser.Math.Distance.Between(orb.x, orb.y, dish.x, dish.y);
        // 타격 범위를 넉넉하게 잡기 위해 (orbSize + dish.getSize())의 1.5배 적용
        if (dist <= (orbSize + dish.getSize()) * 1.5) {
          hit = true;
          break;
        }
      }

      if (hit) {
        const nextHitTime = this.lastHitTimes.get(dish) || 0;
        if (gameTime >= nextHitTime) {
          // 폭탄(dangerous)은 HP와 관계없이 즉시 제거
          if (dish.isDangerous()) {
            dish.forceDestroy(true);
            this.activateOverclock(gameTime, overclockConfig);
          } else {
            // 일반 접시는 데미지 적용
            dish.applyDamageWithUpgrades(damage, 0, criticalChanceBonus);
          }
          // Set Cooldown
          this.lastHitTimes.set(dish, gameTime + hitInterval);
        }
      }
    });

    // Boss collision check
    const bosses = getBossSnapshots();
    for (const boss of bosses) {
      for (const orb of this.orbPositions) {
        const dist = Phaser.Math.Distance.Between(orb.x, orb.y, boss.x, boss.y);
        if (dist <= orbSize + boss.radius) {
          const nextHitTime = this.bossLastHitTimes.get(boss.id) ?? 0;
          if (gameTime >= nextHitTime) {
            onBossDamage(boss.id, damage, orb.x, orb.y);
            this.bossLastHitTimes.set(boss.id, gameTime + hitInterval);
          }
          break;
        }
      }
    }
  }

  private resolveOverclockConfig(upgradeData?: SystemUpgradeData): OrbOverclockConfig {
    const durationMs = Math.max(0, Math.floor(upgradeData?.overclockDurationMs ?? 0));
    const speedMultiplier = Math.max(1, upgradeData?.overclockSpeedMultiplier ?? 1);
    const rawMaxStacks = Math.floor(upgradeData?.overclockMaxStacks ?? 0);
    const maxStacks =
      durationMs > 0 && speedMultiplier > 1 ? Math.max(1, rawMaxStacks) : 0;

    return {
      durationMs,
      speedMultiplier,
      maxStacks,
    };
  }

  private updateOverclockState(gameTime: number, config: OrbOverclockConfig): void {
    if (config.maxStacks <= 0) {
      this.resetOverclock();
      return;
    }

    if (this.overclockStacks > 0 && gameTime >= this.overclockExpireAt) {
      this.resetOverclock();
    }
  }

  private getOverclockSpeedMultiplier(config: OrbOverclockConfig): number {
    if (this.overclockStacks <= 0) {
      return 1;
    }
    return 1 + (config.speedMultiplier - 1) * this.overclockStacks;
  }

  private activateOverclock(gameTime: number, config: OrbOverclockConfig): void {
    if (config.maxStacks <= 0 || config.durationMs <= 0 || config.speedMultiplier <= 1) {
      return;
    }

    this.overclockStacks = Math.min(config.maxStacks, this.overclockStacks + 1);
    this.overclockExpireAt = gameTime + config.durationMs;
  }

  private resetOverclock(): void {
    this.overclockStacks = 0;
    this.overclockExpireAt = 0;
  }

  public getOrbs(): OrbPosition[] {
    return this.orbPositions;
  }
}
