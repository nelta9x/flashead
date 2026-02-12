/** Non-class token for type-safe DI of callbacks, primitives, etc. */
export class ServiceToken<T> {
  readonly _phantom?: T;
  constructor(public readonly description: string) {}
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ClassKey<T> = abstract new (...args: any[]) => T;

export class ServiceRegistry {
  private services = new Map<unknown, unknown>();
  /** Keys registered via resolveEntries — lifecycle managed by destroyAll(). */
  private readonly managed = new Set<unknown>();

  /** Register a value directly (external — NOT lifecycle-managed). */
  set<T>(key: ClassKey<T>, value: T): void;
  set<T>(key: ServiceToken<T>, value: T): void;
  set(key: unknown, value: unknown): void {
    this.services.set(key, value);
  }

  /** Type-safe lookup. Throws if not found. */
  get<T>(key: ClassKey<T>): T;
  get<T>(key: ServiceToken<T>): T;
  get(key: unknown): unknown {
    const svc = this.services.get(key);
    if (svc === undefined) {
      const name =
        typeof key === 'function'
          ? (key as { name: string }).name
          : (key as ServiceToken<unknown>).description;
      throw new Error(`Service not found: ${name}`);
    }
    return svc;
  }

  has(key: unknown): boolean {
    return this.services.has(key);
  }

  /**
   * Auto-instantiate a class and register it.
   * Reads `Class.inject` to resolve constructor dependencies from the registry.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  registerClass<T>(cls: new (...args: any[]) => T): T {
    const inject: unknown[] = (cls as InjectableClass).inject ?? [];
    const deps = inject.map((dep) => this.get(dep as ClassKey<unknown>));
    const instance = new cls(...deps);
    this.services.set(cls as ClassKey<T>, instance);
    this.managed.add(cls);
    return instance;
  }

  /**
   * Resolve an array of ServiceEntry declarations in order.
   * Entries become lifecycle-managed (destroyAll calls destroy/clear on them).
   */
  resolveEntries(entries: ServiceEntry[]): void {
    for (const entry of entries) {
      if (typeof entry === 'function') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this.registerClass(entry as new (...args: any[]) => unknown);
      } else {
        const value = entry.factory(this);
        this.services.set(entry.key, value);
        this.managed.add(entry.key);
      }
    }
  }

  /**
   * Destroy all managed services in reverse registration order.
   * Calls destroy() / clear() / clearAll() if available.
   * External values (registered via set()) are skipped.
   */
  destroyAll(): void {
    const entries = Array.from(this.services.entries());
    for (let i = entries.length - 1; i >= 0; i--) {
      const [key, value] = entries[i];
      if (!this.managed.has(key)) continue;
      if (value == null || typeof value === 'function') continue;
      const obj = value as Record<string, unknown>;
      if (typeof obj.destroy === 'function') (obj.destroy as () => void).call(obj);
      if (typeof obj.clear === 'function') (obj.clear as () => void).call(obj);
      if (typeof obj.clearAll === 'function') (obj.clearAll as () => void).call(obj);
    }
    this.managed.clear();
    this.services.clear();
  }
}

interface InjectableClass {
  inject?: unknown[];
}

/** A class constructor (auto-inject via static inject) or a custom factory. */
export type ServiceEntry =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  | (new (...args: any[]) => unknown)
  | { key: unknown; factory: (r: ServiceRegistry) => unknown };
