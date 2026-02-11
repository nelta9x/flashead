import { describe, expect, it, vi } from 'vitest';
import { EntityVisualSystem } from '../../src/systems/entity-systems/EntityVisualSystem';

function createMockEntity(overrides: { active?: boolean; isDead?: boolean } = {}) {
  return {
    active: overrides.active ?? true,
    getIsDead: vi.fn().mockReturnValue(overrides.isDead ?? false),
    tickVisual: vi.fn(),
  };
}

describe('EntityVisualSystem', () => {
  it('calls tickVisual with delta on active entities', () => {
    const system = new EntityVisualSystem();
    const e1 = createMockEntity();
    const e2 = createMockEntity();

    system.tick([e1, e2] as never, 16);

    expect(e1.tickVisual).toHaveBeenCalledWith(16);
    expect(e2.tickVisual).toHaveBeenCalledWith(16);
  });

  it('skips inactive entities', () => {
    const system = new EntityVisualSystem();
    const inactive = createMockEntity({ active: false });

    system.tick([inactive] as never, 16);

    expect(inactive.tickVisual).not.toHaveBeenCalled();
  });

  it('skips dead entities', () => {
    const system = new EntityVisualSystem();
    const dead = createMockEntity({ isDead: true });

    system.tick([dead] as never, 16);

    expect(dead.tickVisual).not.toHaveBeenCalled();
  });
});
