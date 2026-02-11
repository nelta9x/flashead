import { describe, expect, it, vi } from 'vitest';
import { World } from '../../src/world/World';
import { EntityMovementSystem } from '../../src/systems/entity-systems/EntityMovementSystem';

describe('EntityMovementSystem', () => {
  it('calls strategy.update and writes to transform', () => {
    const world = new World();
    const system = new EntityMovementSystem(world);

    world.createEntity('e1');
    world.statusCache.set('e1', { isFrozen: false, slowFactor: 1.0, isShielded: false });
    world.transform.set('e1', { x: 0, y: 0, baseX: 0, baseY: 0, alpha: 1, scaleX: 1, scaleY: 1 });
    world.visualState.set('e1', { hitFlashPhase: 0, wobblePhase: 0, blinkPhase: 0, isBeingPulled: false, pullPhase: 0 });
    const strategy = { update: vi.fn().mockReturnValue({ x: 100, y: 200 }), init: vi.fn(), destroy: vi.fn() };
    world.movement.set('e1', { strategy: strategy as never });

    system.tick([] as never, 16);

    expect(strategy.update).toHaveBeenCalledWith(16, false, false);
    const t = world.transform.getRequired('e1');
    expect(t.baseX).toBe(100);
    expect(t.baseY).toBe(200);
    expect(t.x).toBe(100);
    expect(t.y).toBe(200);
  });

  it('applies boss shake/push offsets', () => {
    const world = new World();
    const system = new EntityMovementSystem(world);

    world.createEntity('e1');
    world.statusCache.set('e1', { isFrozen: false, slowFactor: 1.0, isShielded: false });
    world.transform.set('e1', { x: 0, y: 0, baseX: 0, baseY: 0, alpha: 1, scaleX: 1, scaleY: 1 });
    world.movement.set('e1', { strategy: { update: vi.fn().mockReturnValue({ x: 50, y: 60 }), init: vi.fn(), destroy: vi.fn() } as never });
    world.bossBehavior.set('e1', {
      behavior: {
        isHitStunned: false, shakeOffsetX: 5, shakeOffsetY: 3, pushOffsetX: 2, pushOffsetY: 1,
      } as never,
    });

    system.tick([] as never, 16);

    const t = world.transform.getRequired('e1');
    expect(t.x).toBe(50 + 5 + 2);
    expect(t.y).toBe(60 + 3 + 1);
  });

  it('skips frozen entities', () => {
    const world = new World();
    const system = new EntityMovementSystem(world);
    const strategy = { update: vi.fn(), init: vi.fn(), destroy: vi.fn() };

    world.createEntity('e1');
    world.statusCache.set('e1', { isFrozen: true, slowFactor: 0.5, isShielded: false });
    world.transform.set('e1', { x: 10, y: 20, baseX: 10, baseY: 20, alpha: 1, scaleX: 1, scaleY: 1 });
    world.movement.set('e1', { strategy: strategy as never });

    system.tick([] as never, 16);

    expect(strategy.update).not.toHaveBeenCalled();
  });

  it('increments wobblePhase when no strategy', () => {
    const world = new World();
    const system = new EntityMovementSystem(world);

    world.createEntity('e1');
    world.statusCache.set('e1', { isFrozen: false, slowFactor: 0.5, isShielded: false });
    world.transform.set('e1', { x: 0, y: 0, baseX: 0, baseY: 0, alpha: 1, scaleX: 1, scaleY: 1 });
    world.visualState.set('e1', { hitFlashPhase: 0, wobblePhase: 0, blinkPhase: 0, isBeingPulled: false, pullPhase: 0 });
    world.movement.set('e1', { strategy: null });

    system.tick([] as never, 16);

    expect(world.visualState.getRequired('e1').wobblePhase).toBeCloseTo(0.05, 5);
  });

  it('skips player entity', () => {
    const world = new World();
    const system = new EntityMovementSystem(world);
    const strategy = { update: vi.fn(), init: vi.fn(), destroy: vi.fn() };

    world.createEntity('player');
    world.movement.set('player', { strategy: strategy as never });

    system.tick([] as never, 16);

    expect(strategy.update).not.toHaveBeenCalled();
  });

  it('skips inactive entities', () => {
    const world = new World();
    const system = new EntityMovementSystem(world);
    const strategy = { update: vi.fn(), init: vi.fn(), destroy: vi.fn() };

    world.movement.set('e1', { strategy: strategy as never });

    system.tick([] as never, 16);

    expect(strategy.update).not.toHaveBeenCalled();
  });
});
