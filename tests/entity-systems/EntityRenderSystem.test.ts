import { describe, expect, it, vi, beforeEach } from 'vitest';

// Mock DishRenderer
vi.mock('../../src/effects/DishRenderer', () => ({
  DishRenderer: {
    renderDish: vi.fn(),
    renderDangerDish: vi.fn(),
  },
}));

import { World } from '../../src/world/World';
import { EntityRenderSystem } from '../../src/systems/entity-systems/EntityRenderSystem';

describe('EntityRenderSystem', () => {
  let world: World;

  beforeEach(() => {
    world = new World();
  });

  it('has correct id', () => {
    const system = new EntityRenderSystem(world, () => undefined);
    expect(system.id).toBe('core:entity_render');
  });

  it('syncs transform to Phaser container', () => {
    const mockContainer = { x: 0, y: 0, alpha: 1, scaleX: 1, scaleY: 1 };
    const mockGraphics = { clear: vi.fn() };
    const system = new EntityRenderSystem(world, () => undefined);

    world.createEntity('e1');
    world.transform.set('e1', { x: 100, y: 200, baseX: 100, baseY: 200, alpha: 0.5, scaleX: 2, scaleY: 2 });
    world.phaserNode.set('e1', {
      container: mockContainer as never,
      graphics: mockGraphics as never,
      body: null,
      spawnTween: null,
    });
    world.identity.set('e1', { entityId: 'e1', entityType: 'basic', isGatekeeper: false });
    world.dishProps.set('e1', {
      dangerous: false, invulnerable: false, color: 0x00ffff, size: 30,
      interactiveRadius: 40, upgradeOptions: {}, destroyedByAbility: false,
    });
    world.health.set('e1', { currentHp: 10, maxHp: 10 });
    world.statusCache.set('e1', { isFrozen: false, slowFactor: 1.0, isShielded: false });
    world.visualState.set('e1', {
      hitFlashPhase: 0, wobblePhase: 0, blinkPhase: 0, isBeingPulled: false, pullPhase: 0,
    });
    world.cursorInteraction.set('e1', {
      isHovered: false, isBeingDamaged: false, damageInterval: 150,
      damageTimerHandle: null, cursorInteractionType: 'dps',
    });

    system.tick([] as never, 16);

    expect(mockContainer.x).toBe(100);
    expect(mockContainer.y).toBe(200);
    expect(mockContainer.alpha).toBe(0.5);
    expect(mockContainer.scaleX).toBe(2);
    expect(mockContainer.scaleY).toBe(2);
  });

  it('calls tickPluginUpdate on entity via lookup', () => {
    const mockEntity = { tickPluginUpdate: vi.fn() };
    const system = new EntityRenderSystem(world, () => mockEntity as never);

    world.createEntity('e1');
    world.phaserNode.set('e1', {
      container: { x: 0, y: 0, alpha: 1, scaleX: 1, scaleY: 1 } as never,
      graphics: {} as never,
      body: null,
      spawnTween: null,
    });
    world.transform.set('e1', { x: 0, y: 0, baseX: 0, baseY: 0, alpha: 1, scaleX: 1, scaleY: 1 });
    world.identity.set('e1', { entityId: 'e1', entityType: 'basic', isGatekeeper: false });
    world.lifetime.set('e1', {
      elapsedTime: 0, movementTime: 500, lifetime: 5000, spawnDuration: 150, globalSlowPercent: 0,
    });

    system.tick([] as never, 16);

    expect(mockEntity.tickPluginUpdate).toHaveBeenCalledWith(16, 500);
  });

  it('skips player entity', () => {
    const mockContainer = { x: 0, y: 0, alpha: 1, scaleX: 1, scaleY: 1 };
    const system = new EntityRenderSystem(world, () => undefined);

    world.createEntity('player');
    world.transform.set('player', { x: 100, y: 200, baseX: 0, baseY: 0, alpha: 1, scaleX: 1, scaleY: 1 });
    world.phaserNode.set('player', {
      container: mockContainer as never,
      graphics: {} as never,
      body: null,
      spawnTween: null,
    });

    system.tick([] as never, 16);

    expect(mockContainer.x).toBe(0); // not synced
  });

  it('skips inactive entities', () => {
    const mockContainer = { x: 0, y: 0, alpha: 1, scaleX: 1, scaleY: 1 };
    const system = new EntityRenderSystem(world, () => undefined);

    world.transform.set('e1', { x: 100, y: 200, baseX: 0, baseY: 0, alpha: 1, scaleX: 1, scaleY: 1 });
    world.phaserNode.set('e1', {
      container: mockContainer as never,
      graphics: {} as never,
      body: null,
      spawnTween: null,
    });

    system.tick([] as never, 16);

    expect(mockContainer.x).toBe(0);
  });
});
