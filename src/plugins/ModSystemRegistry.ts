/**
 * ModSystemRegistry: MOD가 매 프레임 실행되는 커스텀 시스템을 등록할 수 있는 레지스트리.
 * 우선순위(priority) 순으로 실행되며, context를 통해 게임 시스템에 접근한다.
 */

import type { StatusEffectManager } from '../systems/StatusEffectManager';
import type { EntityQueryService } from '../systems/EntityQueryService';
import type { EventBus } from '../utils/EventBus';

export interface ModSystemContext {
  readonly entities: EntityQueryService;
  readonly statusEffectManager: StatusEffectManager;
  readonly eventBus: EventBus;
}

export type ModTickFn = (delta: number, context: ModSystemContext) => void;

interface RegisteredSystem {
  readonly id: string;
  readonly tickFn: ModTickFn;
  readonly priority: number;
}

export class ModSystemRegistry {
  private systems: RegisteredSystem[] = [];
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
  }

  runAll(delta: number, context: ModSystemContext): void {
    if (!this.sorted) {
      this.systems.sort((a, b) => a.priority - b.priority);
      this.sorted = true;
    }

    for (const system of this.systems) {
      system.tickFn(delta, context);
    }
  }

  getSystemIds(): readonly string[] {
    return this.systems.map((s) => s.id);
  }

  clear(): void {
    this.systems.length = 0;
    this.sorted = true;
  }
}
