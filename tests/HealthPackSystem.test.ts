import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock Phaser
vi.mock('phaser', () => {
  return {
    default: {
      Scene: class {},
      Math: {
        Between: vi.fn((min, max) => min),
      },
    },
  };
});

import { HealthPackSystem } from '../src/systems/HealthPackSystem';
import { GameEvents } from '../src/utils/EventBus';

// Mock constants
vi.mock('../src/data/constants', () => ({
  GAME_WIDTH: 800,
  HEAL_PACK: {
    COOLDOWN: 5000,
    MAX_ACTIVE: 1,
    SPAWN_CHANCE: {
      1: 0.5,
      2: 0.3,
      3: 0.1,
      4: 0,
      5: 0,
    },
  },
}));

// Mock EventBus
const mockEmit = vi.fn();
const mockOn = vi.fn();
vi.mock('../src/utils/EventBus', () => ({
  EventBus: {
    getInstance: () => ({
      emit: mockEmit,
      on: mockOn,
      off: vi.fn(),
    }),
  },
  GameEvents: {
    HP_CHANGED: 'hp_changed',
    HEALTH_PACK_COLLECTED: 'health_pack_collected',
    HEALTH_PACK_MISSED: 'health_pack_missed',
  },
}));

// Mock Entity and Pool
const mockPack = {
  spawn: vi.fn(),
  update: vi.fn(),
  active: false,
};

vi.mock('../src/entities/HealthPack', () => {
  return {
    HealthPack: vi.fn(() => mockPack),
  };
});

// We can mock ObjectPool properly or use a simple mock implementation
const mockAcquire = vi.fn(() => mockPack);
const mockRelease = vi.fn();
const mockForEach = vi.fn();
const mockGetActiveCount = vi.fn(() => 0);
const mockClear = vi.fn();

vi.mock('../src/utils/ObjectPool', () => {
  return {
    ObjectPool: vi.fn().mockImplementation(() => ({
      acquire: mockAcquire,
      release: mockRelease,
      forEach: mockForEach,
      getActiveCount: mockGetActiveCount,
      clear: mockClear,
    })),
  };
});

describe('HealthPackSystem', () => {
  let system: HealthPackSystem;
  let mockScene: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockScene = {};
    system = new HealthPackSystem(mockScene);
  });

  describe('Initialization', () => {
    it('should subscribe to events', () => {
      expect(mockOn).toHaveBeenCalledWith(GameEvents.HP_CHANGED, expect.any(Function));
      expect(mockOn).toHaveBeenCalledWith(GameEvents.HEALTH_PACK_COLLECTED, expect.any(Function));
      expect(mockOn).toHaveBeenCalledWith(GameEvents.HEALTH_PACK_MISSED, expect.any(Function));
    });
  });

  describe('Spawn Logic', () => {
    it('should calculate spawn chance based on HP', () => {
      // Default HP is 5
      expect(system.getSpawnChance()).toBe(0);

      // Simulate HP change to 1
      const hpCallback = mockOn.mock.calls.find((call) => call[0] === GameEvents.HP_CHANGED)[1];
      hpCallback({ hp: 1 });

      expect(system.getSpawnChance()).toBe(0.5);
    });

    it('should not spawn if cooldown active', () => {
      // Set HP to 1 (high chance)
      const hpCallback = mockOn.mock.calls.find((call) => call[0] === GameEvents.HP_CHANGED)[1];
      hpCallback({ hp: 1 });

      // Spawn once
      system.update(1000, 10000);
      // Force success

      // But wait, the system logic is probabilistic.
      // We need to control Math.random.
      const originalRandom = Math.random;
      Math.random = vi.fn(() => 0.01); // Always succeed if chance > 0

      // Reset mocks for clean state
      mockAcquire.mockClear();
      mockPack.spawn.mockClear();

      // Trigger update
      // lastSpawnTime is -COOLDOWN (-5000)
      // current gameTime 1000. 1000 < -5000 + 5000 (0)? No. 1000 > 0. So Cooldown OK.

      system.update(1000, 1000); // delta 1000, time 1000

      expect(mockAcquire).toHaveBeenCalled();

      // Now cooldown is active (lastSpawnTime = 1000)
      // Try again at time 2000 (2000 < 1000 + 5000 = 6000) -> Cooldown!
      mockAcquire.mockClear();
      system.update(1000, 2000);

      expect(mockAcquire).not.toHaveBeenCalled();

      Math.random = originalRandom;
    });

    it('should not spawn if max active reached', () => {
      // HP 1
      const hpCallback = mockOn.mock.calls.find((call) => call[0] === GameEvents.HP_CHANGED)[1];
      hpCallback({ hp: 1 });

      mockGetActiveCount.mockReturnValue(1); // Max is 1

      const originalRandom = Math.random;
      Math.random = vi.fn(() => 0.01);

      system.update(1000, 10000);

      expect(mockAcquire).not.toHaveBeenCalled();

      Math.random = originalRandom;
    });
  });

  describe('Event Handling', () => {
    it('should release pack on collected', () => {
      const callback = mockOn.mock.calls.find(
        (call) => call[0] === GameEvents.HEALTH_PACK_COLLECTED
      )[1];
      const pack = {};
      callback({ pack });
      expect(mockRelease).toHaveBeenCalledWith(pack);
    });

    it('should release pack on missed', () => {
      const callback = mockOn.mock.calls.find(
        (call) => call[0] === GameEvents.HEALTH_PACK_MISSED
      )[1];
      const pack = {};
      callback({ pack });
      expect(mockRelease).toHaveBeenCalledWith(pack);
    });
  });
});
