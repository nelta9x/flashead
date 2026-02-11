import Phaser from 'phaser';
import { Entity, EntitySpawnConfig } from '../entities/Entity';
import { ObjectPool } from '../utils/ObjectPool';
import { PluginRegistry } from '../plugins/PluginRegistry';

export interface EntitySnapshot {
  id: string;
  x: number;
  y: number;
  radius: number;
}

export class EntityManager {
  private readonly scene: Phaser.Scene;
  private readonly pools = new Map<string, ObjectPool<Entity>>();
  private readonly activeEntities = new Map<string, Entity>();
  private readonly entityPoolType = new Map<string, string>();
  private readonly gatekeepers = new Set<string>();
  private readonly nonPooledEntities = new Map<string, Entity>();

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  // === Pool initialization ===

  ensurePool(typeId: string, poolSize: number): void {
    if (this.pools.has(typeId)) return;
    if (poolSize <= 0) return;

    this.pools.set(
      typeId,
      new ObjectPool<Entity>(
        () => new Entity(this.scene),
        Math.min(poolSize, 10),
        poolSize
      )
    );
  }

  ensurePoolsFromRegistry(): void {
    const registry = PluginRegistry.getInstance();
    for (const [, plugin] of registry.getAllEntityTypes()) {
      if (plugin.config.poolSize > 0) {
        this.ensurePool(plugin.typeId, plugin.config.poolSize);
      }
    }
  }

  // === Spawn ===

  spawnEntity(config: EntitySpawnConfig, x: number, y: number): Entity | null {
    const plugin = PluginRegistry.getInstance().getEntityType(config.entityType);
    if (!plugin) return null;

    let entity: Entity | null = null;

    if (plugin.config.poolSize > 0) {
      const pool = this.pools.get(config.entityType);
      if (pool) {
        entity = pool.acquire();
      }
    } else {
      // Non-pooled (boss-style): create on demand
      entity = new Entity(this.scene);
      this.nonPooledEntities.set(config.entityId, entity);
    }

    if (!entity) return null;

    entity.spawn(x, y, config, plugin);
    this.activeEntities.set(config.entityId, entity);
    if (plugin.config.poolSize > 0) {
      this.entityPoolType.set(config.entityId, config.entityType);
    }

    if (config.isGatekeeper) {
      this.gatekeepers.add(config.entityId);
    }

    return entity;
  }

  // === Update ===

  updateAll(delta: number, _gameTime: number): void {
    // Phase 1: collect dead entities
    const deadIds: string[] = [];
    for (const [entityId, entity] of this.activeEntities) {
      if (!entity.active) {
        deadIds.push(entityId);
      } else {
        entity.update(delta);
      }
    }
    // Phase 2: remove dead entries
    for (const entityId of deadIds) {
      this.activeEntities.delete(entityId);
      this.gatekeepers.delete(entityId);
      this.entityPoolType.delete(entityId);
    }
  }

  // === Cursor interaction ===

  updateCursorInteraction(cursorX: number, cursorY: number, cursorRadius: number): void {
    for (const [, entity] of this.activeEntities) {
      if (!entity.active) continue;

      const dist = Phaser.Math.Distance.Between(cursorX, cursorY, entity.x, entity.y);
      const entityRadius = entity.getSize();
      entity.setInCursorRange(dist <= cursorRadius + entityRadius);
    }
  }

  // === Deactivation ===

  deactivateEntity(entityId: string): void {
    const entity = this.activeEntities.get(entityId);
    if (!entity) return;

    entity.deactivate();
    this.activeEntities.delete(entityId);
    this.gatekeepers.delete(entityId);

    // Release back to pool if pooled (O(1) lookup)
    const poolType = this.entityPoolType.get(entityId);
    if (poolType) {
      const pool = this.pools.get(poolType);
      if (pool) {
        pool.release(entity);
      }
      this.entityPoolType.delete(entityId);
    }

    // Clean up non-pooled
    const nonPooled = this.nonPooledEntities.get(entityId);
    if (nonPooled) {
      nonPooled.destroy();
      this.nonPooledEntities.delete(entityId);
    }
  }

  clearAll(): void {
    for (const [entityId, entity] of this.activeEntities) {
      entity.deactivate();
      this.activeEntities.delete(entityId);
    }
    this.gatekeepers.clear();
    this.entityPoolType.clear();

    for (const [, pool] of this.pools) {
      pool.releaseAll();
    }

    for (const [id, entity] of this.nonPooledEntities) {
      entity.destroy();
      this.nonPooledEntities.delete(id);
    }
  }

  clearGatekeepers(): void {
    for (const entityId of this.gatekeepers) {
      const entity = this.activeEntities.get(entityId);
      if (entity) {
        entity.deactivate();
        this.activeEntities.delete(entityId);
      }
    }
    this.gatekeepers.clear();

    for (const [id, entity] of this.nonPooledEntities) {
      entity.destroy();
      this.nonPooledEntities.delete(id);
    }
  }

  // === Query ===

  getActiveEntities(): Entity[] {
    return Array.from(this.activeEntities.values()).filter((e) => e.active);
  }

  getGatekeepers(): Entity[] {
    const result: Entity[] = [];
    for (const entityId of this.gatekeepers) {
      const entity = this.activeEntities.get(entityId);
      if (entity?.active) {
        result.push(entity);
      }
    }
    return result;
  }

  areAllGatekeepersDead(): boolean {
    if (this.gatekeepers.size === 0) return false;
    for (const entityId of this.gatekeepers) {
      const entity = this.activeEntities.get(entityId);
      if (entity?.active) return false;
    }
    return true;
  }

  findNearestGatekeeper(x: number, y: number): EntitySnapshot | null {
    let nearest: Entity | null = null;
    let nearestDist = Infinity;

    for (const entityId of this.gatekeepers) {
      const entity = this.activeEntities.get(entityId);
      if (!entity?.active) continue;

      const dist = Phaser.Math.Distance.Between(x, y, entity.x, entity.y);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = entity;
      }
    }

    if (!nearest) return null;
    return {
      id: nearest.getEntityId(),
      x: nearest.x,
      y: nearest.y,
      radius: nearest.getSize(),
    };
  }

  getEntity(entityId: string): Entity | null {
    return this.activeEntities.get(entityId) ?? null;
  }

  // === Pool access (for Dish-compatible iteration) ===

  getPool(typeId: string): ObjectPool<Entity> | undefined {
    return this.pools.get(typeId);
  }

  forEachActive(callback: (entity: Entity) => void): void {
    for (const [, entity] of this.activeEntities) {
      if (entity.active) {
        callback(entity);
      }
    }
  }

  // === Cleanup ===

  destroy(): void {
    this.clearAll();
    for (const [, pool] of this.pools) {
      pool.clear();
    }
    this.pools.clear();
  }
}
