import { describe, expect, it, vi } from 'vitest';
import { EntityRenderSystem } from '../../src/systems/entity-systems/EntityRenderSystem';

function createMockEntity(overrides: { active?: boolean; isDead?: boolean } = {}) {
  return {
    active: overrides.active ?? true,
    getIsDead: vi.fn().mockReturnValue(overrides.isDead ?? false),
    tickRender: vi.fn(),
  };
}

describe('EntityRenderSystem', () => {
  it('calls tickRender with delta on active entities', () => {
    const system = new EntityRenderSystem();
    const e1 = createMockEntity();
    const e2 = createMockEntity();

    system.tick([e1, e2] as never, 16);

    expect(e1.tickRender).toHaveBeenCalledWith(16);
    expect(e2.tickRender).toHaveBeenCalledWith(16);
  });

  it('skips inactive entities', () => {
    const system = new EntityRenderSystem();
    const inactive = createMockEntity({ active: false });

    system.tick([inactive] as never, 16);

    expect(inactive.tickRender).not.toHaveBeenCalled();
  });

  it('skips dead entities', () => {
    const system = new EntityRenderSystem();
    const dead = createMockEntity({ isDead: true });

    system.tick([dead] as never, 16);

    expect(dead.tickRender).not.toHaveBeenCalled();
  });
});
