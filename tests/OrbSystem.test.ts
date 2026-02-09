import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { UpgradeSystem } from '../src/systems/UpgradeSystem';
import type { ObjectPool } from '../src/utils/ObjectPool';
import type { Dish } from '../src/entities/Dish';

// Mock Phaser
vi.mock('phaser', () => {
  return {
    default: {
      Math: {
        Distance: {
          Between: (x1: number, y1: number, x2: number, y2: number) => {
            return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
          },
        },
        DegToRad: (deg: number) => deg * (Math.PI / 180),
      },
    },
  };
});

// Mock EventBus
const mockEmit = vi.fn();
vi.mock('../src/utils/EventBus', async () => {
  const actual = await vi.importActual('../src/utils/EventBus');
  return {
    ...actual,
    EventBus: {
      getInstance: () => ({
        emit: mockEmit,
      }),
    },
  };
});

import { OrbSystem } from '../src/systems/OrbSystem';

type MockDish = {
  active: boolean;
  x: number;
  y: number;
  getSize: () => number;
  isDangerous: () => boolean;
  isFullySpawned?: ReturnType<typeof vi.fn>;
  applyDamageWithUpgrades: ReturnType<typeof vi.fn>;
  forceDestroy?: ReturnType<typeof vi.fn>;
};

describe('OrbSystem', () => {
  let system: OrbSystem;
  let mockUpgradeSystem: {
    getOrbitingOrbLevel: ReturnType<typeof vi.fn>;
    getOrbitingOrbData: ReturnType<typeof vi.fn>;
    getMagnetLevel: ReturnType<typeof vi.fn>;
    getCriticalChanceBonus: ReturnType<typeof vi.fn>;
    getSystemUpgrade: ReturnType<typeof vi.fn>;
  };
  let mockDishPool: { forEach: (callback: (dish: Dish) => void) => void };
  let mockDishes: MockDish[];

  beforeEach(() => {
    vi.clearAllMocks();

    mockUpgradeSystem = {
      getOrbitingOrbLevel: vi.fn(),
      getOrbitingOrbData: vi.fn(),
      getMagnetLevel: vi.fn().mockReturnValue(0),
      getCriticalChanceBonus: vi.fn().mockReturnValue(0),
      getSystemUpgrade: vi.fn().mockReturnValue({
        hitInterval: 300,
        overclockDurationMs: 0,
        overclockSpeedMultiplier: 1,
        overclockMaxStacks: 0,
      }),
    };

    mockDishes = [];
    mockDishPool = {
      forEach: vi.fn((callback: (dish: Dish) => void) => {
        mockDishes.forEach((dish) => callback(dish as unknown as Dish));
      }),
    };

    system = new OrbSystem(mockUpgradeSystem as unknown as UpgradeSystem);
  });

  it('should not spawn orbs if level is 0', () => {
    mockUpgradeSystem.getOrbitingOrbLevel.mockReturnValue(0);

    system.update(100, 0, 0, 0, mockDishPool as unknown as ObjectPool<Dish>);

    expect(system.getOrbs()).toHaveLength(0);
  });

  it('should spawn orbs if level > 0', () => {
    mockUpgradeSystem.getOrbitingOrbLevel.mockReturnValue(1);
    mockUpgradeSystem.getOrbitingOrbData.mockReturnValue({
      count: 2,
      damage: 10,
      speed: 100,
      radius: 100,
      size: 10,
    });

    system.update(100, 0, 0, 0, mockDishPool as unknown as ObjectPool<Dish>);

    const orbs = system.getOrbs();
    expect(orbs).toHaveLength(2);
    // Initial angle 0 + speed update.
    // For simiplicity, just check radius
    const orb = orbs[0];
    const dist = Math.sqrt(orb.x * orb.x + orb.y * orb.y);
    expect(dist).toBeCloseTo(100);
  });

  it('should apply damage to dishes in range', () => {
    mockUpgradeSystem.getOrbitingOrbLevel.mockReturnValue(1);
    mockUpgradeSystem.getOrbitingOrbData.mockReturnValue({
      count: 1,
      damage: 10,
      speed: 0, // Stop rotation for easy calc
      radius: 100,
      size: 10,
    });

    // Player at 0,0. Orb at 100,0. Size 10.
    const mockDish = {
      active: true,
      x: 100,
      y: 0,
      getSize: () => 10,
      isDangerous: () => false,
      applyDamageWithUpgrades: vi.fn(),
    };
    mockDishes.push(mockDish);

    system.update(100, 1000, 0, 0, mockDishPool as unknown as ObjectPool<Dish>);

    expect(mockDish.applyDamageWithUpgrades).toHaveBeenCalledWith(10, 0, 0);
  });

  it('should respect hit cooldown', () => {
    mockUpgradeSystem.getOrbitingOrbLevel.mockReturnValue(1);
    mockUpgradeSystem.getOrbitingOrbData.mockReturnValue({
      count: 1,
      damage: 10,
      speed: 0,
      radius: 100,
      size: 10,
    });

    const mockDish = {
      active: true,
      x: 100,
      y: 0,
      getSize: () => 10,
      isDangerous: () => false,
      applyDamageWithUpgrades: vi.fn(),
    };
    mockDishes.push(mockDish);

    // First hit
    system.update(100, 1000, 0, 0, mockDishPool as unknown as ObjectPool<Dish>);
    expect(mockDish.applyDamageWithUpgrades).toHaveBeenCalledTimes(1);

    // Second update (immediate) - Should fail cooldown
    mockDish.applyDamageWithUpgrades.mockClear();
    system.update(100, 1100, 0, 0, mockDishPool as unknown as ObjectPool<Dish>); // +100ms
    expect(mockDish.applyDamageWithUpgrades).not.toHaveBeenCalled();

    // Third update (after cooldown 300ms)
    system.update(100, 1400, 0, 0, mockDishPool as unknown as ObjectPool<Dish>); // +400ms from start
    expect(mockDish.applyDamageWithUpgrades).toHaveBeenCalledTimes(1);
  });

  it('should use hitInterval from upgrade data (orbiting_orb) for cooldown', () => {
    mockUpgradeSystem.getOrbitingOrbLevel.mockReturnValue(1);
    mockUpgradeSystem.getOrbitingOrbData.mockReturnValue({
      count: 1,
      damage: 10,
      speed: 0,
      radius: 100,
      size: 10,
    });
    mockUpgradeSystem.getSystemUpgrade.mockReturnValue({ hitInterval: 900 });

    const mockDish = {
      active: true,
      x: 100,
      y: 0,
      getSize: () => 10,
      isDangerous: () => false,
      applyDamageWithUpgrades: vi.fn(),
    };
    mockDishes.push(mockDish);

    // First hit at t=1000
    system.update(100, 1000, 0, 0, mockDishPool as unknown as ObjectPool<Dish>);
    expect(mockDish.applyDamageWithUpgrades).toHaveBeenCalledTimes(1);

    // 800ms later: still in cooldown when hitInterval=900
    mockDish.applyDamageWithUpgrades.mockClear();
    system.update(100, 1800, 0, 0, mockDishPool as unknown as ObjectPool<Dish>);
    expect(mockDish.applyDamageWithUpgrades).not.toHaveBeenCalled();

    // 900ms later: cooldown expired
    system.update(100, 1900, 0, 0, mockDishPool as unknown as ObjectPool<Dish>);
    expect(mockDish.applyDamageWithUpgrades).toHaveBeenCalledTimes(1);
  });

  it('should forward critical chance bonus to dish damage calculation', () => {
    mockUpgradeSystem.getOrbitingOrbLevel.mockReturnValue(1);
    mockUpgradeSystem.getOrbitingOrbData.mockReturnValue({
      count: 1,
      damage: 10,
      speed: 0,
      radius: 100,
      size: 10,
    });
    mockUpgradeSystem.getCriticalChanceBonus.mockReturnValue(0.35);

    const mockDish = {
      active: true,
      x: 100,
      y: 0,
      getSize: () => 10,
      isDangerous: () => false,
      applyDamageWithUpgrades: vi.fn(),
    };
    mockDishes.push(mockDish);

    system.update(100, 1000, 0, 0, mockDishPool as unknown as ObjectPool<Dish>);

    expect(mockDish.applyDamageWithUpgrades).toHaveBeenCalledWith(10, 0, 0.35);
  });

  it('should apply magnet synergy to size', () => {
    mockUpgradeSystem.getOrbitingOrbLevel.mockReturnValue(1);
    mockUpgradeSystem.getOrbitingOrbData.mockReturnValue({
      count: 1,
      damage: 10,
      speed: 0,
      radius: 100,
      size: 10,
    });
    mockUpgradeSystem.getMagnetLevel.mockReturnValue(5); // Level 5 Magnet

    system.update(100, 0, 0, 0, mockDishPool as unknown as ObjectPool<Dish>);

    const orb = system.getOrbs()[0];
    // Base 10. Magnet 5 * 0.2 = +100% -> 2.0x -> 20.
    expect(orb.size).toBe(20);
  });

  it('should hit dangerous dishes only when fully spawned', () => {
    mockUpgradeSystem.getOrbitingOrbLevel.mockReturnValue(1);
    mockUpgradeSystem.getOrbitingOrbData.mockReturnValue({
      count: 1,
      damage: 10,
      speed: 0,
      radius: 100,
      size: 10,
    });

    const mockBomb = {
      active: true,
      x: 100,
      y: 0,
      getSize: () => 10,
      isDangerous: () => true,
      isFullySpawned: vi.fn(),
      applyDamageWithUpgrades: vi.fn(),
      forceDestroy: vi.fn(),
    };
    mockDishes.push(mockBomb);

    // Case 1: Dangerous and NOT fully spawned
    mockBomb.isFullySpawned.mockReturnValue(false);
    system.update(100, 1000, 0, 0, mockDishPool as unknown as ObjectPool<Dish>);
    expect(mockBomb.forceDestroy).not.toHaveBeenCalled();

    // Case 2: Dangerous and fully spawned but TOO FAR
    mockBomb.isFullySpawned.mockReturnValue(true);
    mockBomb.x = 200; // Orb is at x=100. Distance = 100. (10+10)*1.5 = 30.
    system.update(100, 2000, 0, 0, mockDishPool as unknown as ObjectPool<Dish>);
    expect(mockBomb.forceDestroy).not.toHaveBeenCalled();

    // Case 3: Within 1.5x range
    mockBomb.x = 125; // Distance = 25. <= 30.
    system.update(100, 3000, 0, 0, mockDishPool as unknown as ObjectPool<Dish>);
    expect(mockBomb.forceDestroy).toHaveBeenCalled();
  });

  it('should trigger overclock only when bomb is destroyed by orb', () => {
    mockUpgradeSystem.getOrbitingOrbLevel.mockReturnValue(1);
    mockUpgradeSystem.getOrbitingOrbData.mockReturnValue({
      count: 1,
      damage: 10,
      speed: 90,
      radius: 100,
      size: 10,
    });
    mockUpgradeSystem.getSystemUpgrade.mockReturnValue({
      hitInterval: 300,
      overclockDurationMs: 3000,
      overclockSpeedMultiplier: 2,
      overclockMaxStacks: 3,
    });

    const normalDish = {
      active: true,
      x: 0,
      y: 100, // t=1000 at angle 90
      getSize: () => 10,
      isDangerous: () => false,
      applyDamageWithUpgrades: vi.fn(),
    };
    mockDishes.push(normalDish);

    system.update(1000, 1000, 0, 0, mockDishPool as unknown as ObjectPool<Dish>);
    system.update(1000, 2000, 0, 0, mockDishPool as unknown as ObjectPool<Dish>);

    const orb = system.getOrbs()[0];
    expect(orb.x).toBeCloseTo(-100, 3);
    expect(orb.y).toBeCloseTo(0, 3);
  });

  it('should apply overclock speed boost after bomb destroy and expire after duration', () => {
    mockUpgradeSystem.getOrbitingOrbLevel.mockReturnValue(1);
    mockUpgradeSystem.getOrbitingOrbData.mockReturnValue({
      count: 1,
      damage: 10,
      speed: 90,
      radius: 100,
      size: 10,
    });
    mockUpgradeSystem.getSystemUpgrade.mockReturnValue({
      hitInterval: 300,
      overclockDurationMs: 3000,
      overclockSpeedMultiplier: 2,
      overclockMaxStacks: 3,
    });

    const bomb = {
      active: true,
      x: 0,
      y: 100, // t=1000 at angle 90
      getSize: () => 10,
      isDangerous: () => true,
      isFullySpawned: vi.fn().mockReturnValue(true),
      applyDamageWithUpgrades: vi.fn(),
      forceDestroy: vi.fn(),
    };
    bomb.forceDestroy.mockImplementation(() => {
      bomb.active = false;
    });
    mockDishes.push(bomb);

    system.update(1000, 1000, 0, 0, mockDishPool as unknown as ObjectPool<Dish>); // stack 1
    system.update(1000, 2000, 0, 0, mockDishPool as unknown as ObjectPool<Dish>); // boosted

    const boostedOrb = system.getOrbs()[0];
    expect(boostedOrb.x).toBeCloseTo(0, 3);
    expect(boostedOrb.y).toBeCloseTo(-100, 3);

    system.update(1000, 5000, 0, 0, mockDishPool as unknown as ObjectPool<Dish>); // expired
    const expiredOrb = system.getOrbs()[0];
    expect(expiredOrb.x).toBeCloseTo(100, 3);
    expect(expiredOrb.y).toBeCloseTo(0, 3);
  });

  it('should stack overclock up to max stacks and clamp additional bomb kills', () => {
    mockUpgradeSystem.getOrbitingOrbLevel.mockReturnValue(1);
    mockUpgradeSystem.getOrbitingOrbData.mockReturnValue({
      count: 1,
      damage: 10,
      speed: 60,
      radius: 100,
      size: 10,
    });
    mockUpgradeSystem.getSystemUpgrade.mockReturnValue({
      hitInterval: 300,
      overclockDurationMs: 3000,
      overclockSpeedMultiplier: 2,
      overclockMaxStacks: 3,
    });

    const makeBomb = (x: number, y: number) => {
      const bomb = {
        active: true,
        x,
        y,
        getSize: () => 10,
        isDangerous: () => true,
        isFullySpawned: vi.fn().mockReturnValue(true),
        applyDamageWithUpgrades: vi.fn(),
        forceDestroy: vi.fn(),
      };
      bomb.forceDestroy.mockImplementation(() => {
        bomb.active = false;
      });
      return bomb;
    };

    mockDishes.push(makeBomb(50, 86.6025403784)); // angle 60, stack 1
    system.update(1000, 1000, 0, 0, mockDishPool as unknown as ObjectPool<Dish>);

    mockDishes.push(makeBomb(-100, 0)); // angle 180, stack 2
    system.update(1000, 2000, 0, 0, mockDishPool as unknown as ObjectPool<Dish>);

    mockDishes.push(makeBomb(100, 0)); // angle 0, stack 3
    system.update(1000, 3000, 0, 0, mockDishPool as unknown as ObjectPool<Dish>);

    mockDishes.push(makeBomb(-50, -86.6025403784)); // angle 240, tries stack 4 but clamped to 3
    system.update(1000, 4000, 0, 0, mockDishPool as unknown as ObjectPool<Dish>);

    system.update(1000, 5000, 0, 0, mockDishPool as unknown as ObjectPool<Dish>);
    const orb = system.getOrbs()[0];

    // stack 3 유지 시 최종 각도 120도
    expect(orb.x).toBeCloseTo(-50, 2);
    expect(orb.y).toBeCloseTo(86.6, 2);
  });
});
