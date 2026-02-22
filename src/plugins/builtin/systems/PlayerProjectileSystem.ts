import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../../../data/constants';
import { Data } from '../../../data/DataManager';
import { EventBus, GameEvents } from '../../../utils/EventBus';
import entitiesJson from '../../../../data/entities.json';
import type { EntitySystem } from '../../../systems/entity-systems/EntitySystem';
import type { World } from '../../../world';
import type { SpatialIndex } from '../../../systems/SpatialIndex';
import type { EntityDamageService } from '../services/EntityDamageService';
import type { BossCombatCoordinator } from '../services/BossCombatCoordinator';
import type { DishDestroyedEventPayload } from '../services/ContentContracts';

interface Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  spawnTime: number;
}

const projConfig = entitiesJson.types.player.projectile;
const visual = projConfig.visual;
const parsedVisualColor = Phaser.Display.Color.HexStringToColor(visual.color).color;
const parsedLightColor = Phaser.Display.Color.HexStringToColor(visual.lightColor).color;
const trail = visual.trail;
const OFFSCREEN_MARGIN = 50;
const SEARCH_RADIUS = 2000;

export class PlayerProjectileSystem implements EntitySystem {
  readonly id = 'core:player_projectile';
  enabled = true;

  private readonly scene: Phaser.Scene;
  private readonly world: World;
  private readonly spatialIndex: SpatialIndex;
  private readonly entityDamageService: EntityDamageService;
  private readonly bcc: BossCombatCoordinator;

  private readonly graphics: Phaser.GameObjects.Graphics;
  private readonly projectiles: Projectile[] = [];

  private readonly handleDishDestroyed = (payload: unknown): void => {
    const p = payload as DishDestroyedEventPayload;
    if (p.byAbility) return;
    this.onDishDestroyed(p.x, p.y);
  };

  constructor(
    scene: Phaser.Scene,
    world: World,
    spatialIndex: SpatialIndex,
    entityDamageService: EntityDamageService,
    bcc: BossCombatCoordinator,
  ) {
    this.scene = scene;
    this.world = world;
    this.spatialIndex = spatialIndex;
    this.entityDamageService = entityDamageService;
    this.bcc = bcc;

    this.graphics = this.scene.add.graphics();
    this.graphics.setDepth(Data.gameConfig.depths.projectile);

    EventBus.getInstance().on(GameEvents.DISH_DESTROYED, this.handleDishDestroyed);
  }

  tick(delta: number): void {
    const gameTime = this.world.context.gameTime;
    const dtSec = delta / 1000;

    // 1. Move projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.x += p.vx * dtSec;
      p.y += p.vy * dtSec;

      const age = gameTime - p.spawnTime;
      if (
        age > projConfig.lifetime ||
        p.x < -OFFSCREEN_MARGIN || p.x > GAME_WIDTH + OFFSCREEN_MARGIN ||
        p.y < -OFFSCREEN_MARGIN || p.y > GAME_HEIGHT + OFFSCREEN_MARGIN
      ) {
        this.removeProjectile(i);
        continue;
      }

      // 2. Collision check against spaceships
      if (this.checkSpaceshipCollision(p, i)) continue;

      // 3. Collision check against bosses
      this.checkBossCollision(p, i);
    }

    // 4. Render
    this.render();
  }

  private onDishDestroyed(dishX: number, dishY: number): void {
    const target = this.findNearestEnemy(dishX, dishY);
    if (!target) return;

    const angle = Math.atan2(target.y - dishY, target.x - dishX);
    const gameTime = this.world.context.gameTime;

    this.projectiles.push({
      x: dishX,
      y: dishY,
      vx: Math.cos(angle) * projConfig.speed,
      vy: Math.sin(angle) * projConfig.speed,
      spawnTime: gameTime,
    });
  }

  private findNearestEnemy(x: number, y: number): { x: number; y: number } | null {
    let nearestDistSq = Number.POSITIVE_INFINITY;
    let nearestTarget: { x: number; y: number } | null = null;

    // Search spaceships in dishGrid
    this.spatialIndex.dishGrid.forEachInRadius(x, y, SEARCH_RADIUS, (entityId) => {
      if (!this.world.isActive(entityId)) return;
      const identity = this.world.identity.get(entityId);
      if (!identity || identity.entityType !== 'spaceship') return;
      const t = this.world.transform.get(entityId);
      if (!t) return;

      const dx = t.x - x;
      const dy = t.y - y;
      const distSq = dx * dx + dy * dy;
      if (distSq < nearestDistSq) {
        nearestDistSq = distSq;
        nearestTarget = { x: t.x, y: t.y };
      }
    });

    // Search bosses
    const bossTarget = this.bcc.findNearestAliveBoss(x, y);
    if (bossTarget) {
      const dx = bossTarget.x - x;
      const dy = bossTarget.y - y;
      const distSq = dx * dx + dy * dy;
      if (distSq < nearestDistSq) {
        nearestTarget = { x: bossTarget.x, y: bossTarget.y };
      }
    }

    return nearestTarget;
  }

  private checkSpaceshipCollision(p: Projectile, index: number): boolean {
    let hit = false;

    this.spatialIndex.dishGrid.forEachInRadius(
      p.x, p.y, projConfig.hitboxRadius + 50,
      (entityId) => {
        if (hit) return;
        if (!this.world.isActive(entityId)) return;
        const identity = this.world.identity.get(entityId);
        if (!identity || identity.entityType !== 'spaceship') return;
        const t = this.world.transform.get(entityId);
        if (!t) return;

        const dx = t.x - p.x;
        const dy = t.y - p.y;
        const distSq = dx * dx + dy * dy;
        const dp = this.world.dishProps.get(entityId);
        const entityRadius = (dp?.size ?? 35) / 2;
        const range = projConfig.hitboxRadius + entityRadius;
        if (distSq < range * range) {
          this.entityDamageService.applyDamage(entityId, projConfig.damage);
          this.removeProjectile(index);
          hit = true;
        }
      },
    );

    return hit;
  }

  private checkBossCollision(p: Projectile, index: number): boolean {
    const bossSnapshots = this.bcc.getAliveVisibleBossSnapshotsWithRadius();
    for (const boss of bossSnapshots) {
      const dx = boss.x - p.x;
      const dy = boss.y - p.y;
      const distSq = dx * dx + dy * dy;
      const range = projConfig.hitboxRadius + boss.radius;
      if (distSq < range * range) {
        this.bcc.damageBoss(boss.id, projConfig.damage, p.x, p.y, false);
        this.removeProjectile(index);
        return true;
      }
    }
    return false;
  }

  private removeProjectile(index: number): void {
    const last = this.projectiles.length - 1;
    if (index !== last) {
      this.projectiles[index] = this.projectiles[last];
    }
    this.projectiles.pop();
  }

  private render(): void {
    this.graphics.clear();

    for (const p of this.projectiles) {
      // Trail (tapered ribbon polygon behind projectile)
      const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      if (speed > 0) {
        const invSpeed = 1 / speed;
        const dirX = -p.vx * invSpeed;
        const dirY = -p.vy * invSpeed;
        const perpX = -dirY;
        const perpY = dirX;
        const headW = projConfig.size * trail.headWidthRatio;
        const tailW = projConfig.size * trail.tailWidthRatio;
        const tailX = p.x + dirX * trail.length;
        const tailY = p.y + dirY * trail.length;

        this.graphics.fillStyle(parsedVisualColor, trail.alpha);
        this.graphics.beginPath();
        this.graphics.moveTo(p.x + perpX * headW, p.y + perpY * headW);
        this.graphics.lineTo(tailX + perpX * tailW, tailY + perpY * tailW);
        this.graphics.lineTo(tailX - perpX * tailW, tailY - perpY * tailW);
        this.graphics.lineTo(p.x - perpX * headW, p.y - perpY * headW);
        this.graphics.closePath();
        this.graphics.fillPath();
      }

      // Glow
      for (const level of visual.glowLevels) {
        this.graphics.fillStyle(parsedVisualColor, level.alpha);
        this.graphics.fillCircle(p.x, p.y, projConfig.size * level.radiusMultiplier);
      }

      // Body
      this.graphics.fillStyle(parsedVisualColor, visual.bodyAlpha);
      this.graphics.fillCircle(p.x, p.y, projConfig.size);

      // Center light
      this.graphics.fillStyle(parsedLightColor, visual.lightAlpha);
      this.graphics.fillCircle(p.x, p.y, projConfig.size * visual.lightRadiusRatio);
    }
  }

  clear(): void {
    this.projectiles.length = 0;
    this.graphics.clear();
  }

  destroy(): void {
    EventBus.getInstance().off(GameEvents.DISH_DESTROYED, this.handleDishDestroyed);
    this.clear();
    this.graphics.destroy();
  }
}
