import type { EventBus } from '../utils/EventBus';
import type { EntitySystemPipeline } from '../systems/EntitySystemPipeline';
import type { StatusEffectManager } from '../systems/StatusEffectManager';
import type { ModModule, ModContext } from './types/ModTypes';
import type { PluginRegistry } from './PluginRegistry';
import type { ModSystemRegistry } from './ModSystemRegistry';
import type { World } from '../world/World';
import { ScopedEventBusWrapper } from './ScopedEventBusWrapper';

interface ModRegistration {
  readonly mod: ModModule;
  readonly abilityIds: string[];
  readonly entityTypeIds: string[];
  readonly modSystemIds: string[];
  readonly entitySystemIds: string[];
  readonly archetypeIds: string[];
  readonly storeNames: string[];
  readonly scopedEventBus: ScopedEventBusWrapper;
}

/**
 * MOD 라이프사이클 관리자.
 * 스냅샷 diff 방식으로 MOD가 등록한 리소스를 추적하고,
 * unload 시 일괄 해제한다.
 */
export class ModRegistry {
  private readonly mods = new Map<string, ModRegistration>();
  private readonly pluginRegistry: PluginRegistry;
  private readonly modSystemRegistry: ModSystemRegistry;
  private readonly entitySystemPipeline: EntitySystemPipeline;
  private readonly statusEffectManager: StatusEffectManager;
  private readonly eventBus: EventBus;
  private readonly world: World;

  constructor(
    pluginRegistry: PluginRegistry,
    modSystemRegistry: ModSystemRegistry,
    entitySystemPipeline: EntitySystemPipeline,
    statusEffectManager: StatusEffectManager,
    eventBus: EventBus,
    world: World,
  ) {
    this.pluginRegistry = pluginRegistry;
    this.modSystemRegistry = modSystemRegistry;
    this.entitySystemPipeline = entitySystemPipeline;
    this.statusEffectManager = statusEffectManager;
    this.eventBus = eventBus;
    this.world = world;
  }

  loadMod(mod: ModModule): boolean {
    if (this.mods.has(mod.id)) {
      return false;
    }

    // 스냅샷: 등록 전 상태
    const abilitiesBefore = new Set(this.pluginRegistry.getAllAbilities().keys());
    const entityTypesBefore = new Set(this.pluginRegistry.getAllEntityTypes().keys());
    const modSystemsBefore = new Set(this.modSystemRegistry.getSystemIds());
    const entitySystemsBefore = new Set(this.entitySystemPipeline.getRegisteredIds());
    const archetypesBefore = new Set(this.world.archetypeRegistry.getIds());
    const storesBefore = new Set(this.world.getStoreNames());

    const scopedEventBus = new ScopedEventBusWrapper(this.eventBus);

    const ctx: ModContext = {
      pluginRegistry: this.pluginRegistry,
      modSystemRegistry: this.modSystemRegistry,
      entitySystemPipeline: this.entitySystemPipeline,
      statusEffectManager: this.statusEffectManager,
      events: scopedEventBus,
      world: this.world,
      archetypeRegistry: this.world.archetypeRegistry,
    };

    try {
      mod.registerMod(ctx);
    } catch {
      // diff 계산 후 롤백
      const reg = this.buildRegistration(
        mod,
        scopedEventBus,
        abilitiesBefore,
        entityTypesBefore,
        modSystemsBefore,
        entitySystemsBefore,
        archetypesBefore,
        storesBefore,
      );
      this.rollbackRegistration(reg);
      return false;
    }

    const reg = this.buildRegistration(
      mod,
      scopedEventBus,
      abilitiesBefore,
      entityTypesBefore,
      modSystemsBefore,
      entitySystemsBefore,
      archetypesBefore,
      storesBefore,
    );
    this.mods.set(mod.id, reg);
    return true;
  }

  unloadMod(id: string): boolean {
    const reg = this.mods.get(id);
    if (!reg) {
      return false;
    }

    const ctx: ModContext = {
      pluginRegistry: this.pluginRegistry,
      modSystemRegistry: this.modSystemRegistry,
      entitySystemPipeline: this.entitySystemPipeline,
      statusEffectManager: this.statusEffectManager,
      events: reg.scopedEventBus,
      world: this.world,
      archetypeRegistry: this.world.archetypeRegistry,
    };

    try {
      reg.mod.unregisterMod?.(ctx);
    } catch {
      // unregisterMod 에러 무시
    }

    this.rollbackRegistration(reg);
    this.mods.delete(id);
    return true;
  }

  unloadAll(): void {
    // 역순 해제 (나중에 로드된 MOD 먼저)
    const ids = [...this.mods.keys()].reverse();
    for (const id of ids) {
      this.unloadMod(id);
    }
  }

  getLoadedModIds(): string[] {
    return [...this.mods.keys()];
  }

  isLoaded(id: string): boolean {
    return this.mods.has(id);
  }

  getModCount(): number {
    return this.mods.size;
  }

  private buildRegistration(
    mod: ModModule,
    scopedEventBus: ScopedEventBusWrapper,
    abilitiesBefore: Set<string>,
    entityTypesBefore: Set<string>,
    modSystemsBefore: Set<string>,
    entitySystemsBefore: Set<string>,
    archetypesBefore: Set<string>,
    storesBefore: Set<string>,
  ): ModRegistration {
    const newAbilities = [...this.pluginRegistry.getAllAbilities().keys()]
      .filter((id) => !abilitiesBefore.has(id));
    const newEntityTypes = [...this.pluginRegistry.getAllEntityTypes().keys()]
      .filter((id) => !entityTypesBefore.has(id));
    const newModSystems = [...this.modSystemRegistry.getSystemIds()]
      .filter((id) => !modSystemsBefore.has(id));
    const newEntitySystems = this.entitySystemPipeline.getRegisteredIds()
      .filter((id) => !entitySystemsBefore.has(id));
    const newArchetypes = this.world.archetypeRegistry.getIds()
      .filter((id) => !archetypesBefore.has(id));
    const newStores = this.world.getStoreNames()
      .filter((name) => !storesBefore.has(name));

    return {
      mod,
      abilityIds: newAbilities,
      entityTypeIds: newEntityTypes,
      modSystemIds: newModSystems,
      entitySystemIds: newEntitySystems,
      archetypeIds: newArchetypes,
      storeNames: newStores,
      scopedEventBus,
    };
  }

  private rollbackRegistration(reg: ModRegistration): void {
    for (const id of reg.abilityIds) {
      this.pluginRegistry.unregisterAbility(id);
    }
    for (const id of reg.entityTypeIds) {
      this.pluginRegistry.unregisterEntityType(id);
    }
    for (const id of reg.modSystemIds) {
      this.modSystemRegistry.unregisterSystem(id);
    }
    for (const id of reg.entitySystemIds) {
      this.entitySystemPipeline.unregister(id);
    }
    for (const id of reg.archetypeIds) {
      this.world.archetypeRegistry.unregister(id);
    }
    for (const name of reg.storeNames) {
      this.world.unregisterStore(name);
    }
    reg.scopedEventBus.removeAll();
  }
}
