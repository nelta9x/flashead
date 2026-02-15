import { beforeEach, describe, expect, it, vi } from 'vitest';
import { World } from '../src/world/World';
import { AbilityTickSystem } from '../src/plugins/builtin/systems/AbilityTickSystem';

describe('AbilityTickSystem', () => {
  let world: World;
  let mockAbilityManager: { update: ReturnType<typeof vi.fn> };
  let system: AbilityTickSystem;

  beforeEach(() => {
    world = new World();
    mockAbilityManager = {
      update: vi.fn(),
    };
    system = new AbilityTickSystem(mockAbilityManager as never, world);
  });

  it('calls AbilityManager.update with world gameTime and player transform each tick', () => {
    const playerId = world.createEntity();
    world.identity.set(playerId, { entityId: playerId, entityType: 'player', isGatekeeper: false });
    world.transform.set(playerId, {
      x: 320,
      y: 240,
      baseX: 320,
      baseY: 240,
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
    });
    world.context.playerId = playerId;
    world.context.gameTime = 12345;

    system.tick(16);

    expect(mockAbilityManager.update).toHaveBeenCalledWith(16, 12345, 320, 240);
  });

  it('does not call update when player is inactive', () => {
    world.context.playerId = 9999;
    world.context.gameTime = 500;

    system.tick(16);

    expect(mockAbilityManager.update).not.toHaveBeenCalled();
  });
});
