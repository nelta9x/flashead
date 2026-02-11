import { describe, expect, it, vi } from 'vitest';
import { EntityTimingSystem } from '../../src/systems/entity-systems/EntityTimingSystem';

function createMockEntity(overrides: { active?: boolean; isDead?: boolean; timedOut?: boolean } = {}) {
  return {
    active: overrides.active ?? true,
    getIsDead: vi.fn().mockReturnValue(overrides.isDead ?? false),
    tickTimeDelta: vi.fn().mockReturnValue(overrides.timedOut ?? false),
  };
}

describe('EntityTimingSystem', () => {
  it('calls tickTimeDelta with delta on active entities', () => {
    const system = new EntityTimingSystem();
    const e1 = createMockEntity();
    const e2 = createMockEntity();

    system.tick([e1, e2] as never, 16);

    expect(e1.tickTimeDelta).toHaveBeenCalledWith(16);
    expect(e2.tickTimeDelta).toHaveBeenCalledWith(16);
  });

  it('skips inactive entities', () => {
    const system = new EntityTimingSystem();
    const inactive = createMockEntity({ active: false });

    system.tick([inactive] as never, 16);

    expect(inactive.tickTimeDelta).not.toHaveBeenCalled();
  });

  it('skips dead entities', () => {
    const system = new EntityTimingSystem();
    const dead = createMockEntity({ isDead: true });

    system.tick([dead] as never, 16);

    expect(dead.tickTimeDelta).not.toHaveBeenCalled();
  });

  it('processes timed-out entities without error', () => {
    const system = new EntityTimingSystem();
    const timedOut = createMockEntity({ timedOut: true });
    const normal = createMockEntity();

    system.tick([timedOut, normal] as never, 16);

    expect(timedOut.tickTimeDelta).toHaveBeenCalledWith(16);
    expect(normal.tickTimeDelta).toHaveBeenCalledWith(16);
  });
});
