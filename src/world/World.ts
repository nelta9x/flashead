import { ComponentStore } from './ComponentStore';
import type { ComponentDef } from './ComponentDef';
import { ArchetypeRegistry, registerBuiltinArchetypes } from './archetypes';
import type { ArchetypeDefinition } from './archetypes'; // used in spawnFromArchetype
import {
  C_Identity,
  C_Transform,
  C_Health,
  C_StatusCache,
  C_Lifetime,
  C_DishProps,
  C_CursorInteraction,
  C_VisualState,
  C_Movement,
  C_PhaserNode,
  C_BossBehavior,
  C_PlayerInput,
  C_PlayerRender,
} from './components';
import type {
  IdentityComponent,
  TransformComponent,
  HealthComponent,
  StatusCacheComponent,
  LifetimeComponent,
  DishPropsComponent,
  CursorInteractionComponent,
  VisualStateComponent,
  MovementComponent,
  PhaserNodeComponent,
  BossBehaviorComponent,
  PlayerInputComponent,
  PlayerRenderComponent,
} from './components';

/**
 * World: 동적 스토어 레지스트리 + entity lifecycle 관리.
 * - register(def)로 ComponentDef 토큰 기반 스토어 등록
 * - store(def)로 타입 안전 스토어 조회
 * - 빌트인 13개 스토어는 typed property로 직접 접근 (기존 코드 호환)
 */
export class World {
  // 동적 스토어 레지스트리 (name → store)
  private readonly stores = new Map<string, ComponentStore<unknown>>();

  // 빌트인 스토어 — typed property로 직접 접근 (기존 코드 호환)
  readonly identity: ComponentStore<IdentityComponent>;
  readonly transform: ComponentStore<TransformComponent>;
  readonly health: ComponentStore<HealthComponent>;
  readonly statusCache: ComponentStore<StatusCacheComponent>;
  readonly lifetime: ComponentStore<LifetimeComponent>;
  readonly dishProps: ComponentStore<DishPropsComponent>;
  readonly cursorInteraction: ComponentStore<CursorInteractionComponent>;
  readonly visualState: ComponentStore<VisualStateComponent>;
  readonly movement: ComponentStore<MovementComponent>;
  readonly phaserNode: ComponentStore<PhaserNodeComponent>;
  readonly bossBehavior: ComponentStore<BossBehaviorComponent>;
  readonly playerInput: ComponentStore<PlayerInputComponent>;
  readonly playerRender: ComponentStore<PlayerRenderComponent>;

  // 아키타입 레지스트리
  readonly archetypeRegistry = new ArchetypeRegistry();

  // Active/Dead entity tracking
  private readonly activeEntities = new Set<string>();
  private readonly deadEntities = new Set<string>();

  constructor() {
    // 빌트인 컴포넌트를 Def 토큰으로 등록
    this.identity = this.register(C_Identity);
    this.transform = this.register(C_Transform);
    this.health = this.register(C_Health);
    this.statusCache = this.register(C_StatusCache);
    this.lifetime = this.register(C_Lifetime);
    this.dishProps = this.register(C_DishProps);
    this.cursorInteraction = this.register(C_CursorInteraction);
    this.visualState = this.register(C_VisualState);
    this.movement = this.register(C_Movement);
    this.phaserNode = this.register(C_PhaserNode);
    this.bossBehavior = this.register(C_BossBehavior);
    this.playerInput = this.register(C_PlayerInput);
    this.playerRender = this.register(C_PlayerRender);

    // 빌트인 아키타입 등록
    registerBuiltinArchetypes(this.archetypeRegistry);
  }

  /** ComponentDef 토큰으로 새 스토어 등록. 중복 시 에러. */
  register<T>(def: ComponentDef<T>): ComponentStore<T> {
    if (this.stores.has(def.name)) {
      throw new Error(`World: store "${def.name}" already registered`);
    }
    const store = new ComponentStore<T>();
    this.stores.set(def.name, store as ComponentStore<unknown>);
    return store;
  }

  /** ComponentDef 토큰으로 스토어 조회 — 타입 안전 */
  store<T>(def: ComponentDef<T>): ComponentStore<T> {
    const s = this.stores.get(def.name);
    if (!s) throw new Error(`World: store "${def.name}" not registered`);
    return s as ComponentStore<T>;
  }

  /** 이름(string)으로 스토어 조회 — 아키타입 스폰용 (내부) */
  getStoreByName(name: string): ComponentStore<unknown> | undefined {
    return this.stores.get(name);
  }

  hasStore(name: string): boolean {
    return this.stores.has(name);
  }

  /** MOD 언로드 시 커스텀 스토어 제거 */
  unregisterStore(name: string): boolean {
    return this.stores.delete(name);
  }

  getStoreNames(): string[] {
    return Array.from(this.stores.keys());
  }

  /** 아키타입 기반 엔티티 스폰. values 키 = ComponentDef.name */
  spawnFromArchetype(
    archetype: ArchetypeDefinition,
    entityId: string,
    values: Record<string, unknown>,
  ): void {
    this.createEntity(entityId);
    for (const def of archetype.components) {
      const store = this.getStoreByName(def.name);
      if (!store) throw new Error(`spawnFromArchetype: store "${def.name}" not registered`);
      const value = values[def.name];
      if (value === undefined) throw new Error(`spawnFromArchetype: missing value for "${def.name}"`);
      store.set(entityId, value);
    }
  }

  createEntity(entityId: string): void {
    this.activeEntities.add(entityId);
    this.deadEntities.delete(entityId);
  }

  destroyEntity(entityId: string): void {
    this.activeEntities.delete(entityId);
    this.deadEntities.delete(entityId);
    this.removeAllComponents(entityId);
  }

  markDead(entityId: string): void {
    this.deadEntities.add(entityId);
  }

  isActive(entityId: string): boolean {
    return this.activeEntities.has(entityId);
  }

  isDead(entityId: string): boolean {
    return this.deadEntities.has(entityId);
  }

  getActiveEntityIds(): string[] {
    return Array.from(this.activeEntities);
  }

  /** 모든 지정 store에 컴포넌트가 존재하는 active 엔티티 ID 반환 */
  query(...stores: ComponentStore<unknown>[]): string[] {
    const result: string[] = [];
    for (const entityId of this.activeEntities) {
      if (stores.every((store) => store.has(entityId))) {
        result.push(entityId);
      }
    }
    return result;
  }

  /** dead 엔티티를 정리하고 제거된 ID 목록을 반환 */
  flushDead(): string[] {
    const flushed = Array.from(this.deadEntities);
    for (const entityId of flushed) {
      this.activeEntities.delete(entityId);
      this.removeAllComponents(entityId);
    }
    this.deadEntities.clear();
    return flushed;
  }

  clear(): void {
    this.activeEntities.clear();
    this.deadEntities.clear();
    this.clearAllStores();
  }

  private removeAllComponents(entityId: string): void {
    this.stores.forEach(s => s.delete(entityId));
  }

  private clearAllStores(): void {
    this.stores.forEach(s => s.clear());
  }
}
