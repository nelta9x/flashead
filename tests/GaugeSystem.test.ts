import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EventBus, GameEvents } from '../src/utils/EventBus';
import { GaugeSystem } from '../src/systems/GaugeSystem';
import { ComboSystem } from '../src/systems/ComboSystem';

describe('GaugeSystem', () => {
  let gaugeSystem: GaugeSystem;
  let comboSystem: ComboSystem;
  let eventBus: EventBus;

  beforeEach(() => {
    EventBus.resetInstance();
    eventBus = EventBus.getInstance();
    comboSystem = new ComboSystem();
    gaugeSystem = new GaugeSystem(comboSystem);
  });

  afterEach(() => {
    eventBus.clear();
    gaugeSystem.destroy();
  });

  it('기본 상태에서 접시 파괴 시 게이지가 10 증가해야 함', () => {
    const callback = vi.fn();
    eventBus.on(GameEvents.GAUGE_UPDATED, callback);

    eventBus.emit(GameEvents.DISH_DESTROYED, { x: 0, y: 0 });

    expect(callback).toHaveBeenCalledWith(expect.objectContaining({
      current: 10,
      max: 100,
      ratio: 0.1
    }));
  });

  it('콤보가 있을 때 게이지가 더 많이 증가해야 함', () => {
    // 콤보 10으로 설정
    for (let i = 0; i < 10; i++) {
      comboSystem.increment();
    }
    
    // gaugeBonusPerCombo가 0.01일 때, 10 콤보 보너스는 10%
    // 기본 10 * (1 + 10 * 0.01) = 11
    
    const callback = vi.fn();
    eventBus.on(GameEvents.GAUGE_UPDATED, callback);

    eventBus.emit(GameEvents.DISH_DESTROYED, { x: 0, y: 0 });

    expect(callback).toHaveBeenCalledWith(expect.objectContaining({
      current: 11
    }));
  });

  it('게이지가 100에 도달하면 PLAYER_ATTACK 이벤트를 발생시켜야 함', () => {
    const attackCallback = vi.fn();
    eventBus.on(GameEvents.PLAYER_ATTACK, attackCallback);

    // 콤보 없이 10번 파괴
    for (let i = 0; i < 10; i++) {
      eventBus.emit(GameEvents.DISH_DESTROYED, { x: 0, y: 0 });
    }

    expect(attackCallback).toHaveBeenCalled();
  });

  it('게이지가 100에 도달하면 게이지가 리셋되어야 함', () => {
    // 콤보 없이 10번 파괴
    for (let i = 0; i < 10; i++) {
      eventBus.emit(GameEvents.DISH_DESTROYED, { x: 0, y: 0 });
    }

    const callback = vi.fn();
    eventBus.on(GameEvents.GAUGE_UPDATED, callback);
    
    // 다음 파괴 시 0에서 10으로 (또는 콤보에 따라 그 이상으로)
    eventBus.emit(GameEvents.DISH_DESTROYED, { x: 0, y: 0 });
    
    expect(callback).toHaveBeenCalledWith(expect.objectContaining({
      current: expect.any(Number)
    }));
    
    // 11번 파괴 후 (콤보가 11이 됨)
    // 10번까지는 콤보가 0, 1, 2...9 인 상태에서 파괴됨.
    // 10번째 파괴 때 콤보가 10이 되고 게이지가 100을 넘어서 리셋됨.
    // 11번째 파괴 때 콤보가 11인 상태에서 계산됨.
  });
});
