import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock Phaser
vi.mock('phaser', () => ({
  default: {
    Math: {
      Distance: {
        Between: (x1: number, y1: number, x2: number, y2: number) =>
          Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2),
      },
    },
    Display: {
      Color: {
        HexStringToColor: () => ({ color: 0xff4444 }),
      },
    },
  },
}));

// Mock DataManager
vi.mock('../src/data/DataManager', () => ({
  Data: {
    gameConfig: {
      depths: { laser: 1500 },
    },
  },
}));

// Mock constants
vi.mock('../src/data/constants', () => ({
  CURSOR_HITBOX: { BASE_RADIUS: 30 },
  GAME_WIDTH: 1280,
  GAME_HEIGHT: 720,
}));

// Mock EventBus — use real implementation
vi.mock('../src/utils/EventBus', async () => {
  const actual = await vi.importActual('../src/utils/EventBus');
  return actual;
});

import { SpaceshipProjectileSystem } from '../src/plugins/builtin/systems/SpaceshipProjectileSystem';
import { EventBus, GameEvents } from '../src/utils/EventBus';
import type { SpaceshipFireProjectilePayload } from '../src/plugins/builtin/systems/SpaceshipAISystem';
import entitiesJson from '../data/entities.json';

const projConfig = entitiesJson.types.spaceship.projectile;

function createMockScene() {
  const graphicsMock = {
    setDepth: vi.fn(),
    clear: vi.fn(),
    fillStyle: vi.fn(),
    fillCircle: vi.fn(),
    destroy: vi.fn(),
  };
  return {
    add: { graphics: vi.fn(() => graphicsMock) },
    cameras: { main: { shake: vi.fn() } },
    _graphics: graphicsMock,
  };
}

function createMockWorld(playerX = 640, playerY = 360) {
  const context = { gameTime: 0, playerId: 'player', currentWave: 1 };
  const transforms = new Map<string, { x: number; y: number }>();
  transforms.set('player', { x: playerX, y: playerY });

  return {
    context,
    transform: { get: (id: string) => transforms.get(id) },
    _transforms: transforms,
  };
}

describe('SpaceshipProjectileSystem', () => {
  let system: SpaceshipProjectileSystem;
  let scene: ReturnType<typeof createMockScene>;
  let world: ReturnType<typeof createMockWorld>;
  let mockHealthSystem: { takeDamage: ReturnType<typeof vi.fn> };
  let mockFeedbackSystem: { onHpLost: ReturnType<typeof vi.fn> };
  let mockAbilityQuery: { getEffectValueOrThrow: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    EventBus.resetInstance();
    scene = createMockScene();
    world = createMockWorld();
    mockHealthSystem = { takeDamage: vi.fn() };
    mockFeedbackSystem = { onHpLost: vi.fn() };
    mockAbilityQuery = { getEffectValueOrThrow: vi.fn().mockReturnValue(0) };

    system = new SpaceshipProjectileSystem(
      scene as never,
      world as never,
      mockHealthSystem as never,
      mockFeedbackSystem as never,
      mockAbilityQuery as never,
    );
  });

  afterEach(() => {
    system.destroy();
    EventBus.resetInstance();
  });

  it('should create projectile on SPACESHIP_FIRE_PROJECTILE event', () => {
    const payload: SpaceshipFireProjectilePayload = {
      fromX: 100, fromY: 100,
      targetX: 200, targetY: 100,
      gameTime: 1000,
    };
    EventBus.getInstance().emit(GameEvents.SPACESHIP_FIRE_PROJECTILE, payload);

    // Tick to move/render
    world.context.gameTime = 1000;
    system.tick(16);

    // Graphics should render the projectile
    expect(scene._graphics.fillCircle).toHaveBeenCalled();
  });

  it('should move projectiles by velocity * dt', () => {
    // Use deterministic angle: fire straight right
    vi.spyOn(Math, 'random').mockReturnValue(0.5); // no variance

    const payload: SpaceshipFireProjectilePayload = {
      fromX: 100, fromY: 100,
      targetX: 200, targetY: 100,
      gameTime: 0,
    };
    EventBus.getInstance().emit(GameEvents.SPACESHIP_FIRE_PROJECTILE, payload);

    world.context.gameTime = 1000;
    system.tick(1000); // 1 second

    // Projectile should have moved right by speed * 1s
    // We check via collision: position should be ~100 + 180 = 280
    // We can verify indirectly by checking render calls
    const fillCalls = scene._graphics.fillCircle.mock.calls;
    // First fillCircle call x should be near 280
    expect(fillCalls.length).toBeGreaterThan(0);
    const xPos = fillCalls[0][0] as number;
    expect(xPos).toBeCloseTo(100 + projConfig.speed, 0);

    vi.restoreAllMocks();
  });

  it('should remove projectiles that exceed lifetime', () => {
    const payload: SpaceshipFireProjectilePayload = {
      fromX: 640, fromY: 360,
      targetX: 641, targetY: 360,
      gameTime: 0,
    };
    EventBus.getInstance().emit(GameEvents.SPACESHIP_FIRE_PROJECTILE, payload);

    // Advance past lifetime
    world.context.gameTime = projConfig.lifetime + 1;
    system.tick(16);

    // Should not render anything (projectile removed)
    expect(scene._graphics.fillCircle).not.toHaveBeenCalled();
  });

  it('should remove projectiles that go offscreen', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);

    const payload: SpaceshipFireProjectilePayload = {
      fromX: 1280, fromY: 360,
      targetX: 1400, targetY: 360,
      gameTime: 0,
    };
    EventBus.getInstance().emit(GameEvents.SPACESHIP_FIRE_PROJECTILE, payload);

    // Move enough time for it to go offscreen (50px margin)
    world.context.gameTime = 1000;
    system.tick(1000);

    // Check fillCircle — if offscreen, no render
    // At 180px/s for 1s from x=1280, x = 1460 > 1280+50 = 1330
    expect(scene._graphics.fillCircle).not.toHaveBeenCalled();

    vi.restoreAllMocks();
  });

  it('should deal damage on cursor collision', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);

    const baseTime = 1000;
    // Fire projectile toward player
    const payload: SpaceshipFireProjectilePayload = {
      fromX: 640, fromY: 360,
      targetX: 641, targetY: 360,
      gameTime: baseTime,
    };
    EventBus.getInstance().emit(GameEvents.SPACESHIP_FIRE_PROJECTILE, payload);

    // Very small tick so projectile is still near player
    world.context.gameTime = baseTime + 10;
    system.tick(10);

    expect(mockHealthSystem.takeDamage).toHaveBeenCalledWith(projConfig.damage);
    expect(mockFeedbackSystem.onHpLost).toHaveBeenCalled();
    expect(scene.cameras.main.shake).toHaveBeenCalledWith(200, 0.008);

    vi.restoreAllMocks();
  });

  it('should respect invincibility cooldown after hit', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);

    const baseTime = 1000;

    // First projectile hits
    EventBus.getInstance().emit(GameEvents.SPACESHIP_FIRE_PROJECTILE, {
      fromX: 640, fromY: 360, targetX: 641, targetY: 360, gameTime: baseTime,
    });
    world.context.gameTime = baseTime + 10;
    system.tick(10);
    expect(mockHealthSystem.takeDamage).toHaveBeenCalledTimes(1);

    // Second projectile during invincibility
    mockHealthSystem.takeDamage.mockClear();
    const duringInvincibility = baseTime + 100;
    EventBus.getInstance().emit(GameEvents.SPACESHIP_FIRE_PROJECTILE, {
      fromX: 640, fromY: 360, targetX: 641, targetY: 360, gameTime: duringInvincibility,
    });
    world.context.gameTime = duringInvincibility + 10;
    system.tick(10);
    expect(mockHealthSystem.takeDamage).not.toHaveBeenCalled();

    // After invincibility
    const afterInvincibility = baseTime + 10 + projConfig.invincibilityDuration;
    EventBus.getInstance().emit(GameEvents.SPACESHIP_FIRE_PROJECTILE, {
      fromX: 640, fromY: 360, targetX: 641, targetY: 360,
      gameTime: afterInvincibility,
    });
    world.context.gameTime = afterInvincibility + 10;
    system.tick(10);
    expect(mockHealthSystem.takeDamage).toHaveBeenCalledTimes(1);

    vi.restoreAllMocks();
  });

  it('should clear projectiles and reset state on clear()', () => {
    EventBus.getInstance().emit(GameEvents.SPACESHIP_FIRE_PROJECTILE, {
      fromX: 640, fromY: 360, targetX: 641, targetY: 360, gameTime: 0,
    });

    system.clear();

    // Tick should render nothing
    world.context.gameTime = 10;
    scene._graphics.fillCircle.mockClear();
    system.tick(10);
    expect(scene._graphics.fillCircle).not.toHaveBeenCalled();
  });

  it('should unsubscribe from EventBus and destroy graphics on destroy()', () => {
    system.destroy();

    // Emit after destroy — should not create projectile
    EventBus.getInstance().emit(GameEvents.SPACESHIP_FIRE_PROJECTILE, {
      fromX: 100, fromY: 100, targetX: 200, targetY: 100, gameTime: 0,
    });

    expect(scene._graphics.destroy).toHaveBeenCalled();

    // Re-create system for afterEach cleanup
    system = new SpaceshipProjectileSystem(
      scene as never,
      world as never,
      mockHealthSystem as never,
      mockFeedbackSystem as never,
      mockAbilityQuery as never,
    );
  });

  it('should apply aimVariance to projectile direction', () => {
    // Force max variance in one direction
    vi.spyOn(Math, 'random').mockReturnValue(1.0);

    EventBus.getInstance().emit(GameEvents.SPACESHIP_FIRE_PROJECTILE, {
      fromX: 0, fromY: 0, targetX: 100, targetY: 0, gameTime: 0,
    });

    // With random=1.0, variance = (1.0 - 0.5) * 2 * varianceRad = +varianceRad
    const varianceRad = (projConfig.aimVarianceDeg * Math.PI) / 180;
    const expectedAngle = 0 + varianceRad;

    world.context.gameTime = 1000;
    system.tick(1000);

    const fillCalls = scene._graphics.fillCircle.mock.calls;
    expect(fillCalls.length).toBeGreaterThan(0);
    const xPos = fillCalls[0][0] as number;
    const yPos = fillCalls[0][1] as number;

    expect(xPos).toBeCloseTo(Math.cos(expectedAngle) * projConfig.speed, 0);
    expect(yPos).toBeCloseTo(Math.sin(expectedAngle) * projConfig.speed, 0);

    vi.restoreAllMocks();
  });
});
