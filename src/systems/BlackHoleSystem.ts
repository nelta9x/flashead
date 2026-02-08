import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../data/constants';
import type { BlackHoleLevelData } from '../data/types';
import type { Dish } from '../entities/Dish';
import type { ObjectPool } from '../utils/ObjectPool';
import type { UpgradeSystem } from './UpgradeSystem';

export interface BlackHoleSnapshot {
  x: number;
  y: number;
  radius: number;
  spawnedAt: number;
}

interface BossSnapshot {
  id: string;
  x: number;
  y: number;
  radius: number;
}

export class BlackHoleSystem {
  private readonly upgradeSystem: UpgradeSystem;
  private readonly getDishPool: () => ObjectPool<Dish>;
  private readonly getBosses: () => BossSnapshot[];
  private readonly damageBoss: (
    bossId: string,
    amount: number,
    sourceX: number,
    sourceY: number
  ) => void;

  private blackHoles: BlackHoleSnapshot[] = [];
  private timeSinceLastSpawn = 0;
  private timeSinceLastDamageTick = 0;
  private lastAppliedLevel = 0;

  constructor(
    upgradeSystem: UpgradeSystem,
    getDishPool: () => ObjectPool<Dish>,
    getBosses: () => BossSnapshot[],
    damageBoss: (bossId: string, amount: number, sourceX: number, sourceY: number) => void
  ) {
    this.upgradeSystem = upgradeSystem;
    this.getDishPool = getDishPool;
    this.getBosses = getBosses;
    this.damageBoss = damageBoss;
  }

  update(delta: number, gameTime: number): void {
    const level = this.upgradeSystem.getBlackHoleLevel();
    if (level <= 0) {
      this.clear();
      return;
    }

    const blackHoleData = this.upgradeSystem.getBlackHoleData();
    if (!blackHoleData) {
      this.clear();
      return;
    }

    if (level !== this.lastAppliedLevel) {
      this.spawnBlackHoles(blackHoleData, gameTime);
      this.timeSinceLastSpawn = 0;
      this.timeSinceLastDamageTick = 0;
      this.lastAppliedLevel = level;
    }

    const spawnInterval = Math.max(1, blackHoleData.spawnInterval);
    this.timeSinceLastSpawn += delta;
    while (this.timeSinceLastSpawn >= spawnInterval) {
      this.timeSinceLastSpawn -= spawnInterval;
      this.spawnBlackHoles(blackHoleData, gameTime);
    }

    this.applyPull(delta, blackHoleData);

    const damageInterval = Math.max(1, blackHoleData.damageInterval);
    this.timeSinceLastDamageTick += delta;
    while (this.timeSinceLastDamageTick >= damageInterval) {
      this.timeSinceLastDamageTick -= damageInterval;
      this.applyDamageTick(blackHoleData);
    }
  }

  public clear(): void {
    this.blackHoles = [];
    this.timeSinceLastSpawn = 0;
    this.timeSinceLastDamageTick = 0;
    this.lastAppliedLevel = 0;
  }

  public getBlackHoles(): BlackHoleSnapshot[] {
    return this.blackHoles.map((hole) => ({ ...hole }));
  }

  private spawnBlackHoles(data: BlackHoleLevelData, gameTime: number): void {
    const safeRadius = this.getSafeRadius(data.radius);
    const spawnCount = Math.max(1, Math.floor(data.spawnCount));
    const holes: BlackHoleSnapshot[] = [];

    for (let i = 0; i < spawnCount; i++) {
      holes.push(this.createHole(safeRadius, gameTime));
    }

    this.blackHoles = holes;
  }

  private getSafeRadius(radius: number): number {
    const maxRadius = Math.min(GAME_WIDTH / 2, GAME_HEIGHT / 2);
    return Phaser.Math.Clamp(radius, 1, maxRadius);
  }

  private createHole(radius: number, spawnedAt: number): BlackHoleSnapshot {
    const minX = radius;
    const maxX = GAME_WIDTH - radius;
    const minY = radius;
    const maxY = GAME_HEIGHT - radius;

    return {
      x: Phaser.Math.FloatBetween(minX, maxX),
      y: Phaser.Math.FloatBetween(minY, maxY),
      radius,
      spawnedAt,
    };
  }

  private applyPull(delta: number, data: BlackHoleLevelData): void {
    if (this.blackHoles.length === 0) return;

    const deltaSeconds = delta / 1000;
    const dishes = this.getDishPool().getActiveObjects();

    for (const dish of dishes) {
      if (!dish.active) continue;

      let pullX = 0;
      let pullY = 0;
      let isPulled = false;

      for (const hole of this.blackHoles) {
        const distance = Phaser.Math.Distance.Between(hole.x, hole.y, dish.x, dish.y);
        if (distance > hole.radius || distance <= 0.001) continue;

        const pullStrength = 1 - distance / hole.radius;
        const pullAmount = data.force * pullStrength * deltaSeconds;
        const angle = Phaser.Math.Angle.Between(dish.x, dish.y, hole.x, hole.y);

        pullX += Math.cos(angle) * pullAmount;
        pullY += Math.sin(angle) * pullAmount;
        isPulled = true;
      }

      if (!isPulled) continue;

      dish.x = Phaser.Math.Clamp(dish.x + pullX, 0, GAME_WIDTH);
      dish.y = Phaser.Math.Clamp(dish.y + pullY, 0, GAME_HEIGHT);
      dish.setBeingPulled(true);
    }
  }

  private applyDamageTick(data: BlackHoleLevelData): void {
    if (this.blackHoles.length === 0) return;

    const dishes = this.getDishPool().getActiveObjects();
    for (const dish of dishes) {
      if (!dish.active || dish.isDangerous()) continue;

      for (const hole of this.blackHoles) {
        const distance = Phaser.Math.Distance.Between(hole.x, hole.y, dish.x, dish.y);
        if (distance > hole.radius) continue;

        dish.applyDamage(data.damage, true);
        break;
      }
    }

    const bosses = this.getBosses();
    for (const boss of bosses) {
      for (const hole of this.blackHoles) {
        const distance = Phaser.Math.Distance.Between(hole.x, hole.y, boss.x, boss.y);
        if (distance > hole.radius + boss.radius) continue;

        this.damageBoss(boss.id, data.damage, hole.x, hole.y);
        break;
      }
    }
  }
}
