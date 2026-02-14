/** 아키타입 = 컴포넌트 이름 문자열 배열. 런타임 확장 가능. */
export interface ArchetypeDefinition {
  readonly id: string;
  readonly components: readonly string[];
}

export class ArchetypeRegistry {
  private readonly archetypes = new Map<string, ArchetypeDefinition>();

  register(def: ArchetypeDefinition): void {
    if (this.archetypes.has(def.id)) {
      throw new Error(`ArchetypeRegistry: archetype "${def.id}" already registered`);
    }
    this.archetypes.set(def.id, def);
  }

  get(id: string): ArchetypeDefinition | undefined {
    return this.archetypes.get(id);
  }

  getRequired(id: string): ArchetypeDefinition {
    const arch = this.archetypes.get(id);
    if (!arch) {
      throw new Error(`ArchetypeRegistry: archetype "${id}" not found`);
    }
    return arch;
  }

  unregister(id: string): boolean {
    return this.archetypes.delete(id);
  }

  has(id: string): boolean {
    return this.archetypes.has(id);
  }

  getAll(): ReadonlyMap<string, ArchetypeDefinition> {
    return this.archetypes;
  }

  getIds(): string[] {
    return Array.from(this.archetypes.keys());
  }

  clear(): void {
    this.archetypes.clear();
  }
}
