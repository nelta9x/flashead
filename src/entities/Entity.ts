import Phaser from 'phaser';
import type { Poolable } from '../utils/ObjectPool';
import { initializeEntitySpawn } from './EntitySpawnInitializer';
import type { StatusEffectManager } from '../systems/StatusEffectManager';
import type { EntityDamageService } from '../systems/EntityDamageService';
import type { World } from '../world';
import type { DishUpgradeOptions } from './EntityTypes';
import type {
  EntityTypePlugin,
} from '../plugins/types';

export interface EntitySpawnConfig {
  entityId: string;
  entityType: string;
  hp: number;
  lifetime: number | null;
  isGatekeeper: boolean;
  spawnAnimation?: { duration: number; ease: string };
  upgradeOptions?: DishUpgradeOptions;
}

export class Entity extends Phaser.GameObjects.Container implements Poolable {
  /** StatusEffectManager 연결 (GameScene.create에서 설정) */
  private static statusEffectManager: StatusEffectManager | null = null;
  /** ECS World 연결 (GameScene.create에서 설정) */
  private static world: World | null = null;
  /** EntityDamageService 연결 (GameScene.create에서 설정) */
  private static damageService: EntityDamageService | null = null;

  static setStatusEffectManager(manager: StatusEffectManager | null): void {
    Entity.statusEffectManager = manager;
  }

  static setWorld(world: World | null): void {
    Entity.world = world;
  }

  static setDamageService(service: EntityDamageService | null): void {
    Entity.damageService = service;
  }

  static getDamageService(): EntityDamageService | null {
    return Entity.damageService;
  }

  active: boolean = false;

  // === Core identity (World 조회 키) ===
  private _entityId: string = '';

  // === Plugin delegation ===
  private typePlugin: EntityTypePlugin | null = null;

  // === Phaser objects ===
  private graphics: Phaser.GameObjects.Graphics;
  private damageTimer: Phaser.Time.TimerEvent | null = null;
  private spawnTween: Phaser.Tweens.Tween | null = null;

  // === Dead state ===
  private _isDead: boolean = false;

  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0);
    scene.add.existing(this);

    this.graphics = scene.add.graphics();
    this.add(this.graphics);

    scene.physics.add.existing(this);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setCircle(30);
    body.setOffset(-30, -30);

    this.setVisible(false);
    this.setActive(false);
  }

  // === Poolable ===

  reset(): void {
    this._isDead = false;
    this.clearDamageTimer();
    if (this.spawnTween) {
      this.spawnTween.stop();
      this.spawnTween = null;
    }
    // Stop boss tweens if any
    if (Entity.world) {
      const bs = Entity.world.bossState.get(this._entityId);
      if (bs) {
        for (const tw of bs.reactionTweens) { tw.stop(); tw.remove(); }
        bs.reactionTweens = [];
        if (bs.deathTween) { bs.deathTween.stop(); bs.deathTween = null; }
      }
    }
    this.setVisible(true);
    this.setActive(true);
    this.setAlpha(1);
    this.setScale(1);
    this.rotation = 0;
  }

  // === Spawn ===

  spawn(x: number, y: number, config: EntitySpawnConfig, plugin: EntityTypePlugin): void {
    this._entityId = config.entityId;
    this.typePlugin = plugin;
    this.active = true;

    if (Entity.world) {
      initializeEntitySpawn(this, Entity.world, config, plugin, x, y);
    }
  }

  // === Identity ===

  getEntityId(): string { return this._entityId; }

  /** Dead state accessor for system guards */
  getIsDead(): boolean { return this._isDead; }

  // === Lifecycle ===

  deactivate(): void {
    this.active = false;
    if (Entity.world) {
      // Stop boss tweens before destroying entity
      const bs = Entity.world.bossState.get(this._entityId);
      if (bs) {
        for (const tw of bs.reactionTweens) { tw.stop(); tw.remove(); }
        bs.reactionTweens = [];
        if (bs.deathTween) { bs.deathTween.stop(); bs.deathTween = null; }
      }
      Entity.world.destroyEntity(this._entityId);
    }
    Entity.statusEffectManager?.clearEntity(this._entityId);
    this.clearDamageTimer();
    if (this.spawnTween) { this.spawnTween.stop(); this.spawnTween = null; }
    this.setVisible(false);
    this.setActive(false);
    this.disableInteractive();
    this.removeAllListeners();

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.enable = false;
    body.setVelocity(0, 0);
  }

  public override destroy(fromScene?: boolean): void {
    if (this.spawnTween) { this.spawnTween.stop(); this.spawnTween = null; }
    this.clearDamageTimer();
    super.destroy(fromScene);
  }

  // === Timer management (public for EntityDamageService) ===

  clearDamageTimer(): void {
    if (this.damageTimer) {
      this.damageTimer.destroy();
      this.damageTimer = null;
    }
  }

  setDamageTimer(timer: Phaser.Time.TimerEvent): void {
    this.clearDamageTimer();
    this.damageTimer = timer;
  }

  // === Public accessors for EntityDamageService / EntitySpawnInitializer ===

  getTypePlugin(): EntityTypePlugin | null { return this.typePlugin; }
  getGraphics(): Phaser.GameObjects.Graphics { return this.graphics; }

  markDead(): void { this._isDead = true; }

  setSpawnTween(tween: Phaser.Tweens.Tween | null): void {
    if (this.spawnTween && tween !== this.spawnTween) {
      this.spawnTween.stop();
    }
    this.spawnTween = tween;
  }
}
