import { beforeEach, describe, expect, it, vi } from 'vitest';

type Listener = (...args: unknown[]) => void;

const listeners = new Map<string, Listener[]>();
const mockOn = vi.fn((event: string, handler: Listener) => {
  const current = listeners.get(event) ?? [];
  current.push(handler);
  listeners.set(event, current);
});
const mockOff = vi.fn();

vi.mock('phaser', () => ({
  default: {
    GameObjects: { Container: class {}, Graphics: class {}, Text: class {}, Group: class {} },
    Scene: class {},
    Math: { Between: vi.fn((min: number) => min), Distance: { Between: vi.fn(() => 0) } },
    Display: { Color: { HexStringToColor: () => ({ color: 0xffffff }) } },
  },
}));

vi.mock('../src/utils/EventBus', () => ({
  EventBus: {
    getInstance: () => ({ on: mockOn, off: mockOff }),
  },
  GameEvents: {
    WAVE_STARTED: 'wave:started',
    WAVE_TRANSITION: 'wave:transition',
    DISH_DESTROYED: 'dish:destroyed',
    DISH_DAMAGED: 'dish:damaged',
    DISH_MISSED: 'dish:missed',
    BOMB_DESTROYED: 'bomb:destroyed',
    BOMB_MISSED: 'bomb:missed',
    PLAYER_ATTACK: 'player:attack',
    COMBO_MILESTONE: 'combo:milestone',
    MONSTER_DIED: 'monster:died',
    HEALTH_PACK_UPGRADED: 'healthPack:upgraded',
    CURSE_HP_PENALTY: 'curse:hpPenalty',
    HP_CHANGED: 'hp:changed',
    HEALTH_PACK_PASSING: 'healthPack:passing',
    HEALTH_PACK_COLLECTED: 'healthPack:collected',
    BLACK_HOLE_CONSUMED: 'blackHole:consumed',
  },
}));

vi.mock('../src/data/constants', () => ({
  COLORS: { CYAN: 0x00ffff, GREEN: 0x00ff88 },
  GAME_WIDTH: 800,
  GAME_HEIGHT: 600,
  INITIAL_HP: 3,
}));

vi.mock('../src/data/DataManager', () => ({
  Data: {
    fallingBomb: { playerDamage: 1, resetCombo: true },
    healthPack: { preMissWarningTextOffsetY: -20 },
    t: (key: string) => key,
  },
}));

function createMockServiceRegistry() {
  const stubs = new Map<unknown, unknown>();

  const mockFeedbackSystem = {
    onHpLost: vi.fn(),
    onPlayerHit: vi.fn(),
    onHealthPackCollected: vi.fn(),
    onComboMilestone: vi.fn(),
    onBombExploded: vi.fn(),
    onHealthPackPassing: vi.fn(),
  };

  const playerRenderData = { gaugeRatio: 0, gameTime: 0, hitFlashAlpha: 0 };
  const mockWorld = {
    fallingBomb: { has: vi.fn(() => false) },
    playerRender: { get: vi.fn(() => playerRenderData) },
    transform: { get: vi.fn(() => ({ x: 100, y: 200 })) },
    context: { playerId: 'player' },
    _playerRenderData: playerRenderData,
  };

  const mockHealthSystem = {
    takeDamage: vi.fn(),
    heal: vi.fn(),
    getHp: vi.fn(() => 3),
    getMaxHp: vi.fn(() => 3),
    setMaxHp: vi.fn(),
  };

  return {
    get: vi.fn((key: unknown) => {
      if (!stubs.has(key)) {
        const keyName = typeof key === 'function' ? (key as { name?: string }).name : '';
        if (keyName === 'World') stubs.set(key, mockWorld);
        else if (keyName === 'FeedbackSystem') stubs.set(key, mockFeedbackSystem);
        else if (keyName === 'HealthSystem') stubs.set(key, mockHealthSystem);
        else {
          stubs.set(key, new Proxy({}, {
            get: (_target, prop) => {
              if (prop === 'then') return undefined;
              return vi.fn();
            },
          }));
        }
      }
      return stubs.get(key);
    }),
    _stubs: stubs,
    _mockFeedbackSystem: mockFeedbackSystem,
    _mockWorld: mockWorld,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

function emit(event: string, payload?: unknown): void {
  const handlers = listeners.get(event) ?? [];
  for (const handler of handlers) {
    handler(payload);
  }
}

describe('ContentEventBinder', () => {
  let ContentEventBinder: typeof import('../src/plugins/builtin/services/ContentEventBinder').ContentEventBinder;
  let GameEvents: typeof import('../src/utils/EventBus').GameEvents;

  beforeEach(async () => {
    vi.clearAllMocks();
    listeners.clear();
    const mod = await import('../src/plugins/builtin/services/ContentEventBinder');
    ContentEventBinder = mod.ContentEventBinder;
    const evtMod = await import('../src/utils/EventBus');
    GameEvents = evtMod.GameEvents;
  });

  describe('HP_CHANGED — player hit feedback', () => {
    it('delta < 0 시 onHpLost + onPlayerHit + hitFlashAlpha = 1 설정', () => {
      const services = createMockServiceRegistry();
      const binder = new ContentEventBinder(services);
      binder.bind();

      emit(GameEvents.HP_CHANGED, { delta: -1 });

      expect(services._mockFeedbackSystem.onHpLost).toHaveBeenCalledTimes(1);
      expect(services._mockFeedbackSystem.onPlayerHit).toHaveBeenCalledWith(100, 200);
      expect(services._mockWorld._playerRenderData.hitFlashAlpha).toBe(1);
    });

    it('delta >= 0 시 onHpLost/onPlayerHit 호출하지 않아야 함', () => {
      const services = createMockServiceRegistry();
      const binder = new ContentEventBinder(services);
      binder.bind();

      emit(GameEvents.HP_CHANGED, { delta: 1 });

      expect(services._mockFeedbackSystem.onHpLost).not.toHaveBeenCalled();
      expect(services._mockFeedbackSystem.onPlayerHit).not.toHaveBeenCalled();
    });

    it('transform이 없으면 onPlayerHit/hitFlashAlpha를 건너뛰어야 함', () => {
      const services = createMockServiceRegistry();
      services._mockWorld.transform.get = vi.fn(() => null);
      const binder = new ContentEventBinder(services);
      binder.bind();

      emit(GameEvents.HP_CHANGED, { delta: -1 });

      // onHpLost는 여전히 호출 (screen shake는 위치 무관)
      expect(services._mockFeedbackSystem.onHpLost).toHaveBeenCalledTimes(1);
      // onPlayerHit은 건너뜀 (위치 없음)
      expect(services._mockFeedbackSystem.onPlayerHit).not.toHaveBeenCalled();
    });
  });
});
