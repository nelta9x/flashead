export interface EntitySystem {
  readonly id: string;
  enabled: boolean;
  tick(delta: number): void;
}
