import { beforeEach, describe, expect, it, vi } from 'vitest';

type EventHandler = (...args: unknown[]) => void;
const listeners = new Map<string, EventHandler[]>();

const mockOn = vi.fn((event: string, handler: EventHandler) => {
  const list = listeners.get(event) ?? [];
  list.push(handler);
  listeners.set(event, list);
});

const mockOff = vi.fn((event: string, handler: EventHandler) => {
  const list = listeners.get(event) ?? [];
  listeners.set(
    event,
    list.filter((candidate) => candidate !== handler)
  );
});

vi.mock('../src/utils/EventBus', () => ({
  EventBus: {
    getInstance: () => ({
      on: mockOn,
      off: mockOff,
      emit: vi.fn(),
    }),
  },
  GameEvents: {
    MONSTER_HP_CHANGED: 'monster:hpChanged',
    MONSTER_DIED: 'monster:died',
  },
}));

vi.mock('../src/data/DataManager', () => ({
  Data: {
    boss: {
      spawn: {
        duration: 1000,
        initialScale: 0.5,
      },
      visual: {
        armor: {
          maxPieces: 10,
          innerRadius: 40,
          radius: 55,
          hpSegments: {
            minPieces: 1,
            maxPieces: 9999,
            targetHpPerPiece: 100,
          },
          bodyColor: 'red',
        },
      },
      feedback: {
        hitReaction: {
          pushDistance: 35,
          pushDuration: 60,
          pushEase: 'Power2.Out',
          shakeDuration: 200,
          shakeIntensity: 4,
          shakeFrequency: 50,
          hitRotation: 0.15,
          returnDuration: 600,
          returnEase: 'Cubic.Out',
          flashDuration: 50,
        },
        vibrationThreshold: 0.6,
        vibrationIntensity: 2,
      },
      movement: {
        drift: {
          xAmplitude: 10,
          xFrequency: 0.001,
          yAmplitude: 10,
          yFrequency: 0.001,
        },
        bounds: {
          minX: 0,
          maxX: 1280,
          minY: 0,
          maxY: 720,
        },
      },
    },
  },
}));

vi.mock('../src/data/constants', () => ({
  COLORS: {
    RED: 0xff0000,
  },
}));

vi.mock('../src/entities/bossHpSegments', () => ({
  resolveBossHpSegmentState: (currentHp: number, maxHp: number) => ({
    pieceCount: 10,
    filledPieces: Math.max(0, Math.round((maxHp <= 0 ? 0 : currentHp / maxHp) * 10)),
  }),
}));

const mockPlayHitFlash = vi.fn();
const mockRender = vi.fn();

vi.mock('../src/effects/BossRenderer', () => ({
  BossRenderer: class {
    public playHitFlash = mockPlayHitFlash;
    public render = mockRender;

    constructor(_scene: unknown, _host: unknown) {}

    public static resolveColor(_value: string | undefined, fallback: number): number {
      return fallback;
    }
  },
}));

const { phaserMock } = vi.hoisted(() => {
  class MockContainer {
    public x: number;
    public y: number;
    public alpha = 1;
    public visible = true;
    public rotation = 0;
    public scaleX = 1;
    public scaleY = 1;
    public destroyed = false;
    public scene: any;

    constructor(scene: any, x: number, y: number) {
      this.scene = scene;
      this.x = x;
      this.y = y;
    }

    setVisible(visible: boolean) {
      this.visible = visible;
      return this;
    }

    setAlpha(alpha: number) {
      this.alpha = alpha;
      return this;
    }

    setScale(scale: number) {
      this.scaleX = scale;
      this.scaleY = scale;
      return this;
    }

    add(_child: unknown) {
      return this;
    }

    destroy(_fromScene?: boolean) {
      this.destroyed = true;
    }
  }

  const mock = {
    GameObjects: {
      Container: MockContainer,
    },
    Math: {
      Clamp: (value: number, min: number, max: number) => Math.max(min, Math.min(max, value)),
      Angle: {
        Between: (x1: number, y1: number, x2: number, y2: number) => Math.atan2(y2 - y1, x2 - x1),
      },
    },
  };

  (globalThis as Record<string, unknown>).Phaser = mock;
  return { phaserMock: mock };
});

vi.mock('phaser', () => {
  return {
    default: phaserMock,
  };
});

import { Boss } from '../src/entities/Boss';

function emit(event: string, payload: unknown): void {
  const handlers = listeners.get(event) ?? [];
  handlers.forEach((handler) => handler(payload));
}

function createTweenManager() {
  const records: Array<{
    config: Record<string, unknown>;
    tween: { stop: ReturnType<typeof vi.fn>; remove: ReturnType<typeof vi.fn> };
  }> = [];

  const add = vi.fn((config: Record<string, unknown>) => {
    const tween = {
      stop: vi.fn(),
      remove: vi.fn(),
    };
    records.push({ config, tween });
    return tween;
  });

  const killTweensOf = vi.fn();
  return { add, killTweensOf, records };
}

function createScene() {
  const tweens = createTweenManager();
  const scene = {
    add: {
      existing: vi.fn(),
    },
    tweens,
  };
  return { scene, tweens };
}

describe('Boss tween lifecycle separation', () => {
  beforeEach(() => {
    listeners.clear();
    mockOn.mockClear();
    mockOff.mockClear();
    mockPlayHitFlash.mockClear();
    mockRender.mockClear();
  });

  it('keeps spawn tween alive when damage event is received right after spawn', () => {
    const { scene, tweens } = createScene();
    const boss = new Boss(scene as never, 640, 100, 'boss_center');

    boss.spawnAt(640, 100);
    const spawnTween = tweens.records[0].tween;

    emit('monster:hpChanged', {
      bossId: 'boss_center',
      max: 1000,
      current: 990,
      ratio: 0.99,
      sourceX: 640,
      sourceY: 360,
    });

    expect(tweens.killTweensOf).not.toHaveBeenCalled();
    expect(spawnTween.stop).not.toHaveBeenCalled();
    expect(spawnTween.remove).not.toHaveBeenCalled();
    expect(boss.visible).toBe(true);
    expect(mockPlayHitFlash).toHaveBeenCalled();
  });

  it('replaces only reaction tweens on repeated damage while keeping spawn tween', () => {
    const { scene, tweens } = createScene();
    const boss = new Boss(scene as never, 640, 100, 'boss_center');

    boss.spawnAt(640, 100);
    const spawnTween = tweens.records[0].tween;

    emit('monster:hpChanged', {
      bossId: 'boss_center',
      max: 1000,
      current: 980,
      ratio: 0.98,
      sourceX: 640,
      sourceY: 360,
    });
    const firstReactionTweens = [tweens.records[1].tween, tweens.records[2].tween];

    emit('monster:hpChanged', {
      bossId: 'boss_center',
      max: 1000,
      current: 960,
      ratio: 0.96,
      sourceX: 640,
      sourceY: 360,
    });

    firstReactionTweens.forEach((tween) => {
      expect(tween.stop).toHaveBeenCalledTimes(1);
      expect(tween.remove).toHaveBeenCalledTimes(1);
    });
    expect(spawnTween.stop).not.toHaveBeenCalled();
    expect(spawnTween.remove).not.toHaveBeenCalled();
  });

  it('cleans managed tweens on deactivate and destroy', () => {
    const { scene, tweens } = createScene();
    const boss = new Boss(scene as never, 640, 100, 'boss_center');

    boss.spawnAt(640, 100);
    emit('monster:hpChanged', {
      bossId: 'boss_center',
      max: 1000,
      current: 980,
      ratio: 0.98,
      sourceX: 640,
      sourceY: 360,
    });

    const spawnTween = tweens.records[0].tween;
    const reactionTweens = [tweens.records[1].tween, tweens.records[2].tween];

    boss.deactivate();
    expect(spawnTween.stop).toHaveBeenCalledTimes(1);
    expect(spawnTween.remove).toHaveBeenCalledTimes(1);
    reactionTweens.forEach((tween) => {
      expect(tween.stop).toHaveBeenCalledTimes(1);
      expect(tween.remove).toHaveBeenCalledTimes(1);
    });

    boss.spawnAt(640, 100);
    emit('monster:hpChanged', {
      bossId: 'boss_center',
      max: 1000,
      current: 970,
      ratio: 0.97,
      sourceX: 640,
      sourceY: 360,
    });

    const secondSpawnTween = tweens.records[3].tween;
    const secondReactionTweens = [tweens.records[4].tween, tweens.records[5].tween];

    boss.destroy();
    expect(secondSpawnTween.stop).toHaveBeenCalledTimes(1);
    expect(secondSpawnTween.remove).toHaveBeenCalledTimes(1);
    secondReactionTweens.forEach((tween) => {
      expect(tween.stop).toHaveBeenCalledTimes(1);
      expect(tween.remove).toHaveBeenCalledTimes(1);
    });
  });
});
