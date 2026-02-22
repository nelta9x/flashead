import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock Phaser
vi.mock('phaser', () => ({
  default: {
    Math: {
      Clamp: (val: number, min: number, max: number) => Math.min(Math.max(val, min), max),
    },
  },
}));

// Mock EventBus - use real instance for emit verification
vi.mock('../src/utils/EventBus', async () => {
  const actual = await vi.importActual('../src/utils/EventBus');
  return actual;
});

import { SpaceshipAISystem } from '../src/plugins/builtin/systems/SpaceshipAISystem';
import { EventBus, GameEvents } from '../src/utils/EventBus';
import entitiesJson from '../data/entities.json';

const dishAttack = entitiesJson.types.spaceship.dishAttack;

interface MockTransform { x: number; y: number }
interface MockIdentity { entityType: string }
interface MockMovement { homeX: number; homeY: number; drift: { bounds: { minX: number; maxX: number; minY: number; maxY: number } } | null }

function createTestWorld() {
  const transforms = new Map<string, MockTransform>();
  const identities = new Map<string, MockIdentity>();
  const movements = new Map<string, MockMovement>();
  const dishTags = new Set<string>();
  const activeSet = new Set<string>();

  const context = { gameTime: 0, playerId: 'player', currentWave: 1 };

  const world = {
    context,
    transform: {
      get: (id: string) => transforms.get(id),
    },
    movement: {
      get: (id: string) => movements.get(id),
    },
    isActive: (id: string) => activeSet.has(id),
    query: vi.fn((...defs: Array<{ name?: string }>) => {
      const firstName = defs[0]?.name;
      if (firstName === 'identity') {
        // query(C_Identity, C_Transform)
        return (function* () {
          for (const [id, identity] of identities) {
            if (!activeSet.has(id)) continue;
            const t = transforms.get(id);
            if (!t) continue;
            yield [id, identity, t];
          }
        })();
      }
      if (firstName === 'dishTag') {
        // query(C_DishTag, C_Identity, C_Transform) — only entities with dishTag
        return (function* () {
          for (const id of dishTags) {
            if (!activeSet.has(id)) continue;
            const identity = identities.get(id);
            const t = transforms.get(id);
            if (!identity || !t) continue;
            yield [id, {}, identity, t];
          }
        })();
      }
      return (function* () {})();
    }),
  };

  const addEntity = (id: string, type: string, x: number, y: number, mov?: MockMovement, hasDishTag = false) => {
    activeSet.add(id);
    identities.set(id, { entityType: type });
    transforms.set(id, { x, y });
    if (mov) movements.set(id, mov);
    if (hasDishTag) dishTags.add(id);
  };

  const removeEntity = (id: string) => {
    activeSet.delete(id);
  };

  const setTransform = (id: string, x: number, y: number) => {
    transforms.set(id, { x, y });
  };

  return { world, addEntity, removeEntity, setTransform, transforms, movements, activeSet };
}

describe('SpaceshipAISystem', () => {
  let system: SpaceshipAISystem;
  let mockDamageService: { applyDamage: ReturnType<typeof vi.fn> };
  let env: ReturnType<typeof createTestWorld>;
  let fireListener: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    EventBus.resetInstance();
    env = createTestWorld();
    mockDamageService = { applyDamage: vi.fn() };

    system = new SpaceshipAISystem(
      env.world as never,
      mockDamageService as never,
    );

    // Subscribe to fire event
    fireListener = vi.fn();
    EventBus.getInstance().on(GameEvents.SPACESHIP_FIRE_PROJECTILE, fireListener);

    // Default player
    env.addEntity('player', 'player', 640, 360);
  });

  afterEach(() => {
    system.destroy();
    EventBus.resetInstance();
  });

  it('should clean stale spaceship states when spaceship becomes inactive', () => {
    env.addEntity('ship1', 'spaceship', 100, 100, {
      homeX: 100, homeY: 100, drift: { bounds: { minX: 0, maxX: 1280, minY: 0, maxY: 720 } },
    }, true);
    // Add a dish so the spaceship has a target
    env.addEntity('dish1', 'basic', 200, 200, undefined, true);

    // Tick to create state
    env.world.context.gameTime = 0;
    system.tick(16);

    // Now remove the spaceship
    env.removeEntity('ship1');

    // Tick again — stale state should be cleaned
    env.world.context.gameTime = 100;
    system.tick(16);

    // clear() should have no problem
    system.clear();
  });

  it('should chase nearest dish by moving homeX/homeY toward it', () => {
    const mov: MockMovement = {
      homeX: 100, homeY: 100,
      drift: { bounds: { minX: 0, maxX: 1280, minY: 0, maxY: 720 } },
    };
    env.addEntity('ship1', 'spaceship', 100, 100, mov, true);
    env.addEntity('dish1', 'basic', 300, 100, undefined, true);

    env.world.context.gameTime = 0;
    system.tick(1000); // 1 second delta

    // homeX should have moved toward 300 (chaseSpeed * 1s = 120)
    expect(mov.homeX).toBeCloseTo(220, 0);
    expect(mov.homeY).toBeCloseTo(100, 0);
  });

  it('should exclude other spaceships from chase targets', () => {
    const mov: MockMovement = {
      homeX: 100, homeY: 100,
      drift: { bounds: { minX: 0, maxX: 1280, minY: 0, maxY: 720 } },
    };
    env.addEntity('ship1', 'spaceship', 100, 100, mov, true);
    // Another spaceship nearby — should NOT be chased
    env.addEntity('ship2', 'spaceship', 110, 100, undefined, true);

    env.world.context.gameTime = 0;
    system.tick(1000);

    // homeX should NOT have changed since no valid target
    expect(mov.homeX).toBe(100);
    expect(mov.homeY).toBe(100);
  });

  it('should apply damage when in eatRange', () => {
    env.addEntity('ship1', 'spaceship', 100, 100, {
      homeX: 100, homeY: 100,
      drift: { bounds: { minX: 0, maxX: 1280, minY: 0, maxY: 720 } },
    }, true);
    // Dish within eatRange (45)
    env.addEntity('dish1', 'basic', 130, 100, undefined, true);

    env.world.context.gameTime = 1000;
    system.tick(16);

    expect(mockDamageService.applyDamage).toHaveBeenCalledWith('dish1', dishAttack.hitDamage);
  });

  it('should respect hitInterval cooldown', () => {
    env.addEntity('ship1', 'spaceship', 100, 100, {
      homeX: 100, homeY: 100,
      drift: { bounds: { minX: 0, maxX: 1280, minY: 0, maxY: 720 } },
    }, true);
    env.addEntity('dish1', 'basic', 130, 100, undefined, true);

    // First hit
    env.world.context.gameTime = 1000;
    system.tick(16);
    expect(mockDamageService.applyDamage).toHaveBeenCalledTimes(1);

    // Too soon
    mockDamageService.applyDamage.mockClear();
    env.world.context.gameTime = 1000 + dishAttack.hitInterval - 1;
    system.tick(16);
    expect(mockDamageService.applyDamage).not.toHaveBeenCalled();

    // After cooldown
    env.world.context.gameTime = 1000 + dishAttack.hitInterval;
    system.tick(16);
    expect(mockDamageService.applyDamage).toHaveBeenCalledTimes(1);
  });

  it('should emit SPACESHIP_FIRE_PROJECTILE when dish is destroyed', () => {
    env.addEntity('ship1', 'spaceship', 100, 100, {
      homeX: 100, homeY: 100,
      drift: { bounds: { minX: 0, maxX: 1280, minY: 0, maxY: 720 } },
    }, true);
    env.addEntity('dish1', 'basic', 130, 100, undefined, true);

    // Simulate dish destruction: applyDamage removes it from active
    mockDamageService.applyDamage.mockImplementation(() => {
      env.removeEntity('dish1');
    });

    env.world.context.gameTime = 1000;
    system.tick(16);

    expect(fireListener).toHaveBeenCalledTimes(1);
    const payload = fireListener.mock.calls[0][0];
    expect(payload.fromX).toBe(100);
    expect(payload.fromY).toBe(100);
    expect(payload.targetX).toBe(640);
    expect(payload.targetY).toBe(360);
    expect(payload.gameTime).toBe(1000);
  });

  it('should NOT emit fire event when dish survives damage', () => {
    env.addEntity('ship1', 'spaceship', 100, 100, {
      homeX: 100, homeY: 100,
      drift: { bounds: { minX: 0, maxX: 1280, minY: 0, maxY: 720 } },
    }, true);
    env.addEntity('dish1', 'basic', 130, 100, undefined, true);

    // Dish stays active after damage
    env.world.context.gameTime = 1000;
    system.tick(16);

    expect(mockDamageService.applyDamage).toHaveBeenCalled();
    expect(fireListener).not.toHaveBeenCalled();
  });

  it('should clamp homeX/homeY to bounds', () => {
    const mov: MockMovement = {
      homeX: 10, homeY: 10,
      drift: { bounds: { minX: 60, maxX: 1220, minY: 60, maxY: 500 } },
    };
    env.addEntity('ship1', 'spaceship', 10, 10, mov, true);
    // Dish far to the left/up — should clamp to minX/minY
    env.addEntity('dish1', 'basic', 0, 0, undefined, true);

    env.world.context.gameTime = 0;
    system.tick(1000);

    expect(mov.homeX).toBeGreaterThanOrEqual(60);
    expect(mov.homeY).toBeGreaterThanOrEqual(60);
  });

  it('should clear spaceship states on clear()', () => {
    env.addEntity('ship1', 'spaceship', 100, 100, {
      homeX: 100, homeY: 100,
      drift: { bounds: { minX: 0, maxX: 1280, minY: 0, maxY: 720 } },
    }, true);
    env.addEntity('dish1', 'basic', 130, 100, undefined, true);

    env.world.context.gameTime = 1000;
    system.tick(16);

    system.clear();

    // After clear, damage cooldown should be reset
    mockDamageService.applyDamage.mockClear();
    env.world.context.gameTime = 1001;
    system.tick(16);
    expect(mockDamageService.applyDamage).toHaveBeenCalled();
  });
});
