import { describe, expect, it, vi } from 'vitest';
import { EntityMovementSystem } from '../../src/systems/entity-systems/EntityMovementSystem';

function createMockEntity(overrides: { active?: boolean; isDead?: boolean } = {}) {
  return {
    active: overrides.active ?? true,
    getIsDead: vi.fn().mockReturnValue(overrides.isDead ?? false),
    tickMovement: vi.fn(),
  };
}

describe('EntityMovementSystem', () => {
  it('calls tickMovement with delta on active entities', () => {
    const system = new EntityMovementSystem();
    const e1 = createMockEntity();
    const e2 = createMockEntity();

    system.tick([e1, e2] as never, 16);

    expect(e1.tickMovement).toHaveBeenCalledWith(16);
    expect(e2.tickMovement).toHaveBeenCalledWith(16);
  });

  it('skips inactive entities', () => {
    const system = new EntityMovementSystem();
    const inactive = createMockEntity({ active: false });

    system.tick([inactive] as never, 16);

    expect(inactive.tickMovement).not.toHaveBeenCalled();
  });

  it('skips dead entities', () => {
    const system = new EntityMovementSystem();
    const dead = createMockEntity({ isDead: true });

    system.tick([dead] as never, 16);

    expect(dead.tickMovement).not.toHaveBeenCalled();
  });
});
