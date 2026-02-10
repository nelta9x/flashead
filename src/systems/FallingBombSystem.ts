import Phaser from 'phaser';
import { GAME_WIDTH, FALLING_BOMB } from '../data/constants';
import { FallingBomb } from '../entities/FallingBomb';
import { ObjectPool } from '../utils/ObjectPool';
import { EventBus, GameEvents } from '../utils/EventBus';

export class FallingBombSystem {
  private pool: ObjectPool<FallingBomb>;
  private lastSpawnTime: number = -FALLING_BOMB.COOLDOWN;
  private timeSinceLastCheck: number = 0;

  constructor(scene: Phaser.Scene) {
    this.pool = new ObjectPool<FallingBomb>(
      () => new FallingBomb(scene, 0, 0),
      2,
      5
    );

    EventBus.getInstance().on(GameEvents.FALLING_BOMB_DESTROYED, (...args: unknown[]) => {
      const data = args[0] as { bomb: FallingBomb };
      this.releaseBomb(data.bomb);
    });

    EventBus.getInstance().on(GameEvents.FALLING_BOMB_MISSED, (...args: unknown[]) => {
      const data = args[0] as { bomb: FallingBomb };
      this.releaseBomb(data.bomb);
    });
  }

  update(delta: number, gameTime: number, currentWave: number): void {
    this.pool.forEach((bomb) => {
      bomb.update(delta);
    });

    if (currentWave < FALLING_BOMB.MIN_WAVE) {
      return;
    }

    this.checkSpawning(delta, gameTime);
  }

  checkCursorCollision(cursorX: number, cursorY: number, cursorRadius: number): void {
    this.pool.forEach((bomb) => {
      if (!bomb.active || !bomb.isFullySpawned()) return;

      const dist = Phaser.Math.Distance.Between(cursorX, cursorY, bomb.x, bomb.y);
      const hitDistance = cursorRadius + bomb.getRadius();

      if (dist <= hitDistance) {
        bomb.forceDestroy(false);
      }
    });
  }

  getPool(): ObjectPool<FallingBomb> {
    return this.pool;
  }

  getActiveCount(): number {
    return this.pool.getActiveCount();
  }

  clear(): void {
    this.pool.clear();
  }

  private checkSpawning(delta: number, gameTime: number): void {
    if (gameTime < this.lastSpawnTime + FALLING_BOMB.COOLDOWN) {
      return;
    }

    if (this.pool.getActiveCount() >= FALLING_BOMB.MAX_ACTIVE) {
      return;
    }

    this.timeSinceLastCheck += delta;
    if (this.timeSinceLastCheck < FALLING_BOMB.CHECK_INTERVAL) {
      return;
    }
    this.timeSinceLastCheck = 0;

    if (Math.random() < FALLING_BOMB.BASE_SPAWN_CHANCE) {
      this.spawnBomb(gameTime);
    }
  }

  private spawnBomb(gameTime: number): void {
    const bomb = this.pool.acquire();
    if (!bomb) return;

    const margin = 80;
    const x = Phaser.Math.Between(margin, GAME_WIDTH - margin);

    bomb.spawn(x);
    this.lastSpawnTime = gameTime;
  }

  private releaseBomb(bomb: FallingBomb): void {
    this.pool.release(bomb);
  }
}
