import Phaser from 'phaser';
import type { MovementStrategy } from '../../types/MovementStrategy';

interface DriftConfig {
  xAmplitude: number;
  xFrequency: number;
  yAmplitude: number;
  yFrequency: number;
}

interface BoundsConfig {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export class DriftMovement implements MovementStrategy {
  private readonly drift: DriftConfig;
  private readonly bounds: BoundsConfig;
  private readonly phaseX: number;
  private readonly phaseY: number;

  private homeX = 0;
  private homeY = 0;
  private movementTime = 0;

  constructor(drift: DriftConfig, bounds: BoundsConfig, seed: string) {
    this.drift = drift;
    this.bounds = bounds;
    this.phaseX = DriftMovement.resolvePhase(`${seed}:x`);
    this.phaseY = DriftMovement.resolvePhase(`${seed}:y`);
  }

  init(homeX: number, homeY: number): void {
    this.homeX = homeX;
    this.homeY = homeY;
    this.movementTime = 0;
  }

  update(delta: number, frozen: boolean, stunned: boolean): { x: number; y: number } {
    if (!frozen && !stunned) {
      this.movementTime += delta;
    }

    const baseX =
      this.homeX +
      Math.sin(this.movementTime * this.drift.xFrequency + this.phaseX) * this.drift.xAmplitude;
    const baseY =
      this.homeY +
      Math.sin(this.movementTime * this.drift.yFrequency + this.phaseY) * this.drift.yAmplitude;

    return {
      x: Phaser.Math.Clamp(baseX, this.bounds.minX, this.bounds.maxX),
      y: Phaser.Math.Clamp(baseY, this.bounds.minY, this.bounds.maxY),
    };
  }

  destroy(): void {
    // No cleanup needed
  }

  private static resolvePhase(seed: string): number {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = (hash << 5) - hash + seed.charCodeAt(i);
      hash |= 0;
    }
    const normalized = (hash >>> 0) / 0xffffffff;
    return normalized * Math.PI * 2;
  }
}
