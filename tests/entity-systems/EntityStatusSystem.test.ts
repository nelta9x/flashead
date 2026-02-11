import { describe, expect, it, vi } from 'vitest';
import { EntityStatusSystem } from '../../src/systems/entity-systems/EntityStatusSystem';

function createMockEntity(overrides: { active?: boolean; isDead?: boolean } = {}) {
  return {
    active: overrides.active ?? true,
    getIsDead: vi.fn().mockReturnValue(overrides.isDead ?? false),
    tickStatusEffects: vi.fn(),
  };
}

describe('EntityStatusSystem', () => {
  it('has correct id', () => {
    const system = new EntityStatusSystem();
    expect(system.id).toBe('core:entity_status');
  });

  it('is enabled by default', () => {
    const system = new EntityStatusSystem();
    expect(system.enabled).toBe(true);
  });

  it('calls tickStatusEffects on active entities', () => {
    const system = new EntityStatusSystem();
    const e1 = createMockEntity();
    const e2 = createMockEntity();

    system.tick([e1, e2] as never, 16);

    expect(e1.tickStatusEffects).toHaveBeenCalledOnce();
    expect(e2.tickStatusEffects).toHaveBeenCalledOnce();
  });

  it('skips inactive entities', () => {
    const system = new EntityStatusSystem();
    const active = createMockEntity();
    const inactive = createMockEntity({ active: false });

    system.tick([active, inactive] as never, 16);

    expect(active.tickStatusEffects).toHaveBeenCalledOnce();
    expect(inactive.tickStatusEffects).not.toHaveBeenCalled();
  });

  it('skips dead entities', () => {
    const system = new EntityStatusSystem();
    const alive = createMockEntity();
    const dead = createMockEntity({ isDead: true });

    system.tick([alive, dead] as never, 16);

    expect(alive.tickStatusEffects).toHaveBeenCalledOnce();
    expect(dead.tickStatusEffects).not.toHaveBeenCalled();
  });

  it('handles empty entity list', () => {
    const system = new EntityStatusSystem();
    expect(() => system.tick([] as never, 16)).not.toThrow();
  });
});
