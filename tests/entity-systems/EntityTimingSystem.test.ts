import { describe, expect, it, vi } from 'vitest';
import { World } from '../../src/world/World';
import { EntityTimingSystem } from '../../src/systems/entity-systems/EntityTimingSystem';

describe('EntityTimingSystem', () => {
  function createSystem(world: World, lookup?: (id: string) => { handleTimeout: () => void } | undefined) {
    return new EntityTimingSystem(world, (lookup ?? (() => undefined)) as never);
  }

  it('increments elapsedTime and movementTime for active entities', () => {
    const world = new World();
    const system = createSystem(world);

    world.createEntity('e1');
    world.statusCache.set('e1', { isFrozen: false, slowFactor: 1.0, isShielded: false });
    world.lifetime.set('e1', {
      elapsedTime: 0, movementTime: 0, lifetime: 5000, spawnDuration: 150, globalSlowPercent: 0,
    });

    system.tick([] as never, 100);

    const lt = world.lifetime.getRequired('e1');
    expect(lt.elapsedTime).toBe(100);
    expect(lt.movementTime).toBe(100);
  });

  it('applies slowFactor to elapsedTime', () => {
    const world = new World();
    const system = createSystem(world);

    world.createEntity('e1');
    world.statusCache.set('e1', { isFrozen: false, slowFactor: 0.5, isShielded: false });
    world.lifetime.set('e1', {
      elapsedTime: 0, movementTime: 0, lifetime: 5000, spawnDuration: 150, globalSlowPercent: 0,
    });

    system.tick([] as never, 100);

    expect(world.lifetime.getRequired('e1').elapsedTime).toBe(50);
    expect(world.lifetime.getRequired('e1').movementTime).toBe(100);
  });

  it('applies globalSlowPercent', () => {
    const world = new World();
    const system = createSystem(world);

    world.createEntity('e1');
    world.statusCache.set('e1', { isFrozen: false, slowFactor: 1.0, isShielded: false });
    world.lifetime.set('e1', {
      elapsedTime: 0, movementTime: 0, lifetime: 5000, spawnDuration: 150, globalSlowPercent: 0.5,
    });

    system.tick([] as never, 100);

    expect(world.lifetime.getRequired('e1').elapsedTime).toBe(50);
  });

  it('calls handleTimeout when lifetime exceeded', () => {
    const world = new World();
    const handleTimeout = vi.fn();
    const system = createSystem(world, () => ({ handleTimeout }));

    world.createEntity('e1');
    world.statusCache.set('e1', { isFrozen: false, slowFactor: 1.0, isShielded: false });
    world.lifetime.set('e1', {
      elapsedTime: 4900, movementTime: 0, lifetime: 5000, spawnDuration: 150, globalSlowPercent: 0,
    });

    system.tick([] as never, 200);

    expect(handleTimeout).toHaveBeenCalledOnce();
  });

  it('skips player entity', () => {
    const world = new World();
    const system = createSystem(world);

    world.createEntity('player');
    world.lifetime.set('player', {
      elapsedTime: 0, movementTime: 0, lifetime: 5000, spawnDuration: 150, globalSlowPercent: 0,
    });

    system.tick([] as never, 100);

    // Player's lifetime should not be updated
    expect(world.lifetime.getRequired('player').elapsedTime).toBe(0);
  });

  it('skips inactive entities', () => {
    const world = new World();
    const system = createSystem(world);

    world.lifetime.set('e1', {
      elapsedTime: 0, movementTime: 0, lifetime: 5000, spawnDuration: 150, globalSlowPercent: 0,
    });

    system.tick([] as never, 100);

    expect(world.lifetime.getRequired('e1').elapsedTime).toBe(0);
  });
});
