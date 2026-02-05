import { EventBus, GameEvents } from '../utils/EventBus';

export class MonsterSystem {
  private currentHp: number = 0;
  private maxHp: number = 0;
  private isDead: boolean = false;

  constructor() {
    // Listen for wave start to reset/spawn monster
    EventBus.getInstance().on(GameEvents.WAVE_STARTED, (...args: unknown[]) => {
      const waveNumber = args[0] as number;
      this.reset(waveNumber);
    });
  }

  reset(waveNumber: number): void {
    // Wave 1 starts with 10 HP (for testing/easy start), scaling up.
    // Example scaling: 10 + (wave-1) * 5
    this.maxHp = 10 + (waveNumber - 1) * 5;
    this.currentHp = this.maxHp;
    this.isDead = false;
    this.emitHpChange();
  }

  takeDamage(amount: number): void {
    if (this.isDead) return;

    this.currentHp = Math.max(0, this.currentHp - amount);
    this.emitHpChange();

    if (this.currentHp === 0) {
      this.die();
    }
  }

  private die(): void {
    this.isDead = true;
    EventBus.getInstance().emit(GameEvents.MONSTER_DIED);
  }

  private emitHpChange(): void {
    EventBus.getInstance().emit(GameEvents.MONSTER_HP_CHANGED, {
      current: this.currentHp,
      max: this.maxHp,
      ratio: this.currentHp / this.maxHp
    });
  }

  getCurrentHp(): number {
    return this.currentHp;
  }

  getMaxHp(): number {
    return this.maxHp;
  }

  isAlive(): boolean {
    return !this.isDead;
  }
}
