import Phaser from 'phaser';
import { SpaceshipRenderer } from './SpaceshipRenderer';
import entitiesJson from '../../../../data/entities.json';
import type { EntityId } from '../../../world/EntityId';
import type {
  EntityTypePlugin,
  EntityTypeConfig,
  EntityTypeRenderer,
} from '../../types';
import type { MovementComponent, World } from '../../../world';

interface SpaceshipMovementConfig {
  type: string;
  drift: {
    xAmplitude: number;
    xFrequency: number;
    yAmplitude: number;
    yFrequency: number;
  };
  bounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };
}

const spaceshipData = entitiesJson.types.spaceship;
const visualConfig = spaceshipData.visual;
const parsedBodyColor = Phaser.Display.Color.HexStringToColor(visualConfig.bodyColor).color;
const parsedAccentColor = Phaser.Display.Color.HexStringToColor(visualConfig.accentColor).color;
const parsedEngineColor = Phaser.Display.Color.HexStringToColor(visualConfig.engineColor).color;

export class SpaceshipPlugin implements EntityTypePlugin {
  readonly typeId = 'spaceship';
  readonly config: EntityTypeConfig = {
    spawnCategory: 'pooled',
    poolSize: spaceshipData.poolSize,
    defaultLifetime: spaceshipData.lifetime,
    isGatekeeper: false,
    cursorInteraction: 'dps',
  };

  private readonly movementConfig: SpaceshipMovementConfig | null;

  constructor(movementConfig?: SpaceshipMovementConfig) {
    this.movementConfig = movementConfig ?? null;
  }

  createRenderer(
    _scene: Phaser.Scene,
    _host: Phaser.GameObjects.Container,
  ): EntityTypeRenderer {
    return {
      render: () => {},
      destroy: () => {},
    };
  }

  onSpawn(entityId: EntityId, world: World): void {
    const pn = world.phaserNode.get(entityId);
    const dishProps = world.dishProps.get(entityId);
    const health = world.health.get(entityId);
    if (!pn || !dishProps || !health) return;

    SpaceshipRenderer.render(pn.graphics, {
      size: dishProps.size,
      currentHp: health.currentHp,
      maxHp: health.maxHp,
      hitFlashPhase: 0,
      movementTime: 0,
      bodyColor: parsedBodyColor,
      accentColor: parsedAccentColor,
      engineColor: parsedEngineColor,
      enginePulseSpeed: visualConfig.enginePulseSpeed,
    });
  }

  onUpdate(entityId: EntityId, world: World, _delta: number, gameTime: number): void {
    const pn = world.phaserNode.get(entityId);
    const dishProps = world.dishProps.get(entityId);
    const health = world.health.get(entityId);
    const visualState = world.visualState.get(entityId);
    if (!pn || !dishProps || !health) return;

    SpaceshipRenderer.render(pn.graphics, {
      size: dishProps.size,
      currentHp: health.currentHp,
      maxHp: health.maxHp,
      hitFlashPhase: visualState?.hitFlashPhase ?? 0,
      movementTime: gameTime,
      bodyColor: parsedBodyColor,
      accentColor: parsedAccentColor,
      engineColor: parsedEngineColor,
      enginePulseSpeed: visualConfig.enginePulseSpeed,
    });
  }

  createMovementData(_entityId: EntityId, homeX: number, homeY: number): MovementComponent {
    if (!this.movementConfig || this.movementConfig.type !== 'drift') {
      return { type: 'none', homeX, homeY, movementTime: 0, drift: null };
    }

    const d = this.movementConfig.drift;
    const b = this.movementConfig.bounds;
    return {
      type: 'drift',
      homeX,
      homeY,
      movementTime: 0,
      drift: {
        xAmplitude: d.xAmplitude,
        xFrequency: d.xFrequency,
        yAmplitude: d.yAmplitude,
        yFrequency: d.yFrequency,
        phaseX: resolvePhase(_entityId, 0),
        phaseY: resolvePhase(_entityId, 1),
        bounds: { minX: b.minX, maxX: b.maxX, minY: b.minY, maxY: b.maxY },
      },
    };
  }
}

function resolvePhase(entityId: EntityId, axis: number): number {
  const hash = Math.imul(entityId, 2654435761) + axis;
  const normalized = ((hash & 0x7fffffff) >>> 0) / 0x7fffffff;
  return normalized * Math.PI * 2;
}
