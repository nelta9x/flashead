import type { ServiceRegistry } from '../../plugins/ServiceRegistry';

export interface SystemStartContext {
  readonly services: ServiceRegistry;
}

export interface EntitySystem {
  readonly id: string;
  enabled: boolean;
  start?(ctx: SystemStartContext): void;
  tick(delta: number): void;
  renderTick?(delta: number): void;
}
