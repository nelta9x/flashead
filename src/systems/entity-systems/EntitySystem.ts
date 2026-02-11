import type { Entity } from '../../entities/Entity';

export interface EntitySystem {
  readonly id: string;
  enabled: boolean;
  tick(entities: Entity[], delta: number): void;
}
