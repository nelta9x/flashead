import { beforeEach, describe, expect, it, vi } from 'vitest';

type Listener = (...args: unknown[]) => void;

const listeners = new Map<string, Listener[]>();
const mockOn = vi.fn((event: string, handler: Listener) => {
  const current = listeners.get(event) ?? [];
  current.push(handler);
  listeners.set(event, current);
});
const mockOff = vi.fn((event: string, handler?: Listener) => {
  if (!handler) {
    listeners.delete(event);
    return;
  }
  const current = listeners.get(event) ?? [];
  listeners.set(
    event,
    current.filter((candidate) => candidate !== handler)
  );
});

vi.mock('phaser', () => ({
  default: {
    GameObjects: {
      Container: class {},
      Graphics: class {},
      Text: class {},
      Group: class {},
    },
    Scene: class {},
    Math: {
      Between: vi.fn((min: number) => min),
      Distance: { Between: vi.fn(() => 0) },
    },
    Display: {
      Color: { HexStringToColor: () => ({ color: 0xffffff }) },
    },
  },
}));

vi.mock('../src/utils/EventBus', () => ({
  EventBus: {
    getInstance: () => ({
      on: mockOn,
      off: mockOff,
    }),
  },
  GameEvents: {
    DISH_DESTROYED: 'dish:destroyed',
    DISH_DAMAGED: 'dish:damaged',
    COMBO_MILESTONE: 'combo:milestone',
    WAVE_STARTED: 'wave:started',
    WAVE_COMPLETED: 'wave:completed',
    UPGRADE_SELECTED: 'upgrade:selected',
    WAVE_COUNTDOWN_TICK: 'wave:countdownTick',
    WAVE_READY: 'wave:ready',
    GAME_OVER: 'game:over',
    DISH_MISSED: 'dish:missed',
    HEALTH_PACK_UPGRADED: 'healthPack:upgraded',
    HP_CHANGED: 'hp:changed',
    HEALTH_PACK_PASSING: 'healthPack:passing',
    HEALTH_PACK_COLLECTED: 'healthPack:collected',
    MONSTER_HP_CHANGED: 'monster:hpChanged',
    GAUGE_UPDATED: 'gauge:updated',
    PLAYER_ATTACK: 'player:attack',
    MONSTER_DIED: 'monster:died',
    FALLING_BOMB_DESTROYED: 'fallingBomb:destroyed',
    BLACK_HOLE_CONSUMED: 'blackHole:consumed',
  },
}));

vi.mock('../src/data/constants', () => ({
  COLORS: { CYAN: 0x00ffff },
  GAME_WIDTH: 800,
  GAME_HEIGHT: 600,
  INITIAL_HP: 3,
}));

vi.mock('../src/data/DataManager', () => ({
  Data: {
    fallingBomb: { playerDamage: 1, resetCombo: true },
    t: (key: string) => key,
  },
}));

/** Minimal mock ServiceRegistry that returns stub services. */
function createMockServiceRegistry() {
  const stubs = new Map<unknown, unknown>();
  return {
    get: vi.fn((key: unknown) => {
      if (!stubs.has(key)) {
        stubs.set(
          key,
          new Proxy(
            {},
            {
              get: (_target, prop) => {
                if (prop === 'then') return undefined;
                return vi.fn();
              },
            }
          )
        );
      }
      return stubs.get(key);
    }),
    _stubs: stubs,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

describe('GameSceneEventBinder', () => {
  // Dynamic import to ensure mocks are applied first
  let GameSceneEventBinder: typeof import('../src/scenes/game/GameSceneEventBinder').GameSceneEventBinder;
  let GameEvents: typeof import('../src/utils/EventBus').GameEvents;

  beforeEach(async () => {
    vi.clearAllMocks();
    listeners.clear();
    const mod = await import('../src/scenes/game/GameSceneEventBinder');
    GameSceneEventBinder = mod.GameSceneEventBinder;
    const evtMod = await import('../src/utils/EventBus');
    GameEvents = evtMod.GameEvents;
  });

  it('binds events once and does not double-bind', () => {
    const services = createMockServiceRegistry();
    const scene = { onWaveCompleted: vi.fn(), onUpgradeSelected: vi.fn(), onGameOver: vi.fn() };
    const binder = new GameSceneEventBinder(services, scene);

    binder.bind();
    const firstBindCalls = mockOn.mock.calls.length;
    expect(firstBindCalls).toBeGreaterThan(0);

    // Second bind should be a no-op
    binder.bind();
    expect(mockOn).toHaveBeenCalledTimes(firstBindCalls);
  });

  it('routes scene lifecycle events to SceneLifecycleCallbacks', () => {
    const services = createMockServiceRegistry();
    const scene = { onWaveCompleted: vi.fn(), onUpgradeSelected: vi.fn(), onGameOver: vi.fn() };
    const binder = new GameSceneEventBinder(services, scene);

    binder.bind();

    // WAVE_COMPLETED → scene.onWaveCompleted
    const waveCompletedListeners = listeners.get(GameEvents.WAVE_COMPLETED) ?? [];
    expect(waveCompletedListeners.length).toBe(1);
    waveCompletedListeners[0](5);
    expect(scene.onWaveCompleted).toHaveBeenCalledWith(5);

    // GAME_OVER → scene.onGameOver
    const gameOverListeners = listeners.get(GameEvents.GAME_OVER) ?? [];
    gameOverListeners[0]();
    expect(scene.onGameOver).toHaveBeenCalled();

    // UPGRADE_SELECTED → scene.onUpgradeSelected
    const upgradeListeners = listeners.get(GameEvents.UPGRADE_SELECTED) ?? [];
    upgradeListeners[0]();
    expect(scene.onUpgradeSelected).toHaveBeenCalled();
  });

  it('resolves service dependencies from ServiceRegistry on event dispatch', () => {
    const services = createMockServiceRegistry();
    const scene = { onWaveCompleted: vi.fn(), onUpgradeSelected: vi.fn(), onGameOver: vi.fn() };
    const binder = new GameSceneEventBinder(services, scene);

    binder.bind();

    // DISH_DESTROYED triggers services.get(DishLifecycleController)
    const dishDestroyedListeners = listeners.get(GameEvents.DISH_DESTROYED) ?? [];
    expect(dishDestroyedListeners.length).toBe(1);
    dishDestroyedListeners[0]({ dish: { id: 'd1' }, x: 10, y: 20 });
    expect(services.get).toHaveBeenCalled();
  });

  it('unbinds every subscription with the same handler references', () => {
    const services = createMockServiceRegistry();
    const scene = { onWaveCompleted: vi.fn(), onUpgradeSelected: vi.fn(), onGameOver: vi.fn() };
    const binder = new GameSceneEventBinder(services, scene);

    binder.bind();
    const bindCount = mockOn.mock.calls.length;
    binder.unbind();

    expect(mockOff).toHaveBeenCalledTimes(bindCount);
    listeners.forEach((registered) => {
      expect(registered.length).toBe(0);
    });
  });
});
