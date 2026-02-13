import Phaser from 'phaser';
import { CURSOR_HITBOX, MAGNET } from '../../../data/constants';
import type { ParticleManager } from '../../../effects/ParticleManager';
import type { EntityDamageService } from '../../../systems/EntityDamageService';
import type { UpgradeSystem } from '../../../systems/UpgradeSystem';
import { C_DishTag, C_DishProps, C_Transform } from '../../../world';
import type { World } from '../../../world';
import type { CursorSnapshot } from '../GameSceneContracts';

interface DishFieldEffectServiceDeps {
  world: World;
  particleManager: ParticleManager;
  upgradeSystem: UpgradeSystem;
  damageService: EntityDamageService;
}

export class DishFieldEffectService {
  private readonly world: World;
  private readonly particleManager: ParticleManager;
  private readonly upgradeSystem: UpgradeSystem;
  private readonly damageService: EntityDamageService;

  constructor(deps: DishFieldEffectServiceDeps) {
    this.world = deps.world;
    this.particleManager = deps.particleManager;
    this.upgradeSystem = deps.upgradeSystem;
    this.damageService = deps.damageService;
  }

  public updateMagnetEffect(delta: number, cursor: CursorSnapshot): void {
    const magnetLevel = this.upgradeSystem.getMagnetLevel();

    if (magnetLevel <= 0) {
      for (const [entityId] of this.world.query(C_DishTag, C_DishProps, C_Transform)) {
        this.damageService.setBeingPulled(entityId, false);
      }
      return;
    }

    const magnetRadius = this.upgradeSystem.getMagnetRadius();
    const magnetForce = this.upgradeSystem.getMagnetForce();
    const deltaSeconds = delta / 1000;

    for (const [entityId, , , t] of this.world.query(C_DishTag, C_DishProps, C_Transform)) {
      this.damageService.setBeingPulled(entityId, false);

      const dist = Phaser.Math.Distance.Between(cursor.x, cursor.y, t.x, t.y);
      if (dist > magnetRadius || dist < MAGNET.MIN_PULL_DISTANCE) continue;

      this.damageService.setBeingPulled(entityId, true);
      const pullStrength = 1 - dist / magnetRadius;
      const pullAmount = magnetForce * pullStrength * deltaSeconds;
      const angle = Phaser.Math.Angle.Between(t.x, t.y, cursor.x, cursor.y);
      const newX = t.x + Math.cos(angle) * pullAmount;
      const newY = t.y + Math.sin(angle) * pullAmount;

      // Transform + Phaser container 둘 다 즉시 변경
      t.x = newX;
      t.y = newY;
      const node = this.world.phaserNode.get(entityId);
      if (node) {
        node.container.x = newX;
        node.container.y = newY;
      }

      if (Math.random() < 0.15) {
        this.particleManager.createMagnetPullEffect(newX, newY, cursor.x, cursor.y);
      }
    }
  }

  public updateCursorAttack(cursor: CursorSnapshot): void {
    const cursorRadius = this.getCursorRadius();

    for (const [entityId, , dp, t] of this.world.query(C_DishTag, C_DishProps, C_Transform)) {
      const size = dp.size;
      const dist = Phaser.Math.Distance.Between(cursor.x, cursor.y, t.x, t.y);
      this.damageService.setInCursorRange(entityId, dist <= cursorRadius + size);
    }
  }

  private getCursorRadius(): number {
    const cursorSizeBonus = this.upgradeSystem.getCursorSizeBonus();
    return CURSOR_HITBOX.BASE_RADIUS * (1 + cursorSizeBonus);
  }
}
