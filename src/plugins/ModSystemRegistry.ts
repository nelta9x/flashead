/**
 * ModSystemRegistry: MOD가 매 프레임 실행되는 커스텀 시스템을 등록할 수 있는 레지스트리.
 * 우선순위(priority) 순으로 실행되며, context를 통해 게임 시스템에 접근한다.
 */

import type { StatusEffectManager } from '../systems/StatusEffectManager';
import type { EntityQueryService } from '../systems/EntityQueryService';
import type { ScopedEventBus } from './types/ModTypes';

export interface ModSystemSharedContext {
  readonly entities: EntityQueryService;
  readonly statusEffectManager: StatusEffectManager;
}

export interface ModSystemContext extends ModSystemSharedContext {
  readonly eventBus: ScopedEventBus;
}

export type ModTickFn = (delta: number, context: ModSystemContext) => void;

interface RegisteredSystem {
  readonly id: string;
  readonly tickFn: ModTickFn;
  readonly priority: number;
}

export class ModSystemRegistry {
  private systems: RegisteredSystem[] = [];
  private readonly systemEventBuses = new Map<string, ScopedEventBus>();
  private sorted = true;

  registerSystem(id: string, tickFn: ModTickFn, priority: number = 0): void {
    // 중복 ID 방지
    this.unregisterSystem(id);
    this.systems.push({ id, tickFn, priority });
    this.sorted = false;
  }

  unregisterSystem(id: string): void {
    const idx = this.systems.findIndex((s) => s.id === id);
    if (idx !== -1) {
      this.systems.splice(idx, 1);
    }
    this.systemEventBuses.delete(id);
  }

  bindSystemEventBus(systemId: string, bus: ScopedEventBus): void {
    const hasSystem = this.systems.some((system) => system.id === systemId);
    if (!hasSystem) {
      throw new Error(`ModSystemRegistry: cannot bind event bus. Unknown system id: "${systemId}"`);
    }
    this.systemEventBuses.set(systemId, bus);
  }

  runAll(delta: number, context: ModSystemSharedContext): void {
    if (!this.sorted) {
      this.systems.sort((a, b) => a.priority - b.priority);
      this.sorted = true;
    }

    for (const system of this.systems) {
      const eventBus = this.systemEventBuses.get(system.id);
      if (!eventBus) {
        throw new Error(
          `ModSystemRegistry: missing scoped event bus binding for system "${system.id}"`
        );
      }
      system.tickFn(delta, { ...context, eventBus });
    }
  }

  getSystemIds(): readonly string[] {
    return this.systems.map((s) => s.id);
  }

  clear(): void {
    this.systems.length = 0;
    this.systemEventBuses.clear();
    this.sorted = true;
  }
}
