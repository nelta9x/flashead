import { EventBus, GameEvents } from '../utils/EventBus';

export class GaugeSystem {
  private currentGauge: number = 0;
  private readonly maxGauge: number = 100; // Fixed max gauge for now
  private readonly gainPerDish: number = 10; // 10 dishes to fill

  private onDishDestroyed = () => this.increaseGauge(this.gainPerDish);
  private onWaveStarted = () => this.reset();

  constructor() {
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    EventBus.getInstance().on(GameEvents.DISH_DESTROYED, this.onDishDestroyed);
    EventBus.getInstance().on(GameEvents.WAVE_STARTED, this.onWaveStarted);
  }

  private increaseGauge(amount: number): void {
    this.currentGauge = Math.min(this.maxGauge, this.currentGauge + amount);
    this.emitUpdate();

    if (this.currentGauge >= this.maxGauge) {
      this.triggerAttack();
    }
  }

  private triggerAttack(): void {
    EventBus.getInstance().emit(GameEvents.PLAYER_ATTACK);
    this.currentGauge = 0; // Reset after attack
    this.emitUpdate();
  }

  private emitUpdate(): void {
    EventBus.getInstance().emit(GameEvents.GAUGE_UPDATED, {
      current: this.currentGauge,
      max: this.maxGauge,
      ratio: this.currentGauge / this.maxGauge
    });
  }

  reset(): void {
    this.currentGauge = 0;
    this.emitUpdate();
  }
  
  destroy(): void {
    EventBus.getInstance().off(GameEvents.DISH_DESTROYED, this.onDishDestroyed);
    EventBus.getInstance().off(GameEvents.WAVE_STARTED, this.onWaveStarted);
  }
}
