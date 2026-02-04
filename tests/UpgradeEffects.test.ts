import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock constants
vi.mock('../src/config/constants', () => ({
  INITIAL_HP: 5,
  UPGRADE_INTERVAL: 30000,
  COMBO_TIMEOUT: 1500,
  UPGRADE_TIMING: {
    BASE_INTERVAL: 15000,
    INCREMENT: 5000,
    MAX_INTERVAL: 30000,
  },
  RARITY_WEIGHTS_BY_COUNT: {
    early: { common: 60, rare: 30, epic: 10, legendary: 0 },
    mid: { common: 45, rare: 35, epic: 17, legendary: 3 },
    late: { common: 30, rare: 35, epic: 25, legendary: 10 },
    endgame: { common: 20, rare: 30, epic: 30, legendary: 20 },
  },
}));

// Mock EventBus
const mockEmit = vi.fn();
const mockOn = vi.fn();
vi.mock('../src/utils/EventBus', () => ({
  EventBus: {
    getInstance: () => ({
      emit: mockEmit,
      on: mockOn,
      off: vi.fn(),
      clear: vi.fn(),
    }),
  },
  GameEvents: {
    HP_CHANGED: 'hp_changed',
    GAME_OVER: 'game_over',
    DISH_DESTROYED: 'dish_destroyed',
    DISH_MISSED: 'dish_missed',
    COMBO_CHANGED: 'combo_changed',
    COMBO_MILESTONE: 'combo_milestone',
    WAVE_COMPLETED: 'wave_completed',
    UPGRADE_AVAILABLE: 'upgrade_available',
    UPGRADE_SELECTED: 'upgrade_selected',
  },
}));

describe('Upgrade Effects Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('UpgradeSystem Stats', () => {
    it('should track bomb shield count', async () => {
      const { UpgradeSystem } = await import('../src/systems/UpgradeSystem');
      const upgrade = new UpgradeSystem();

      expect(upgrade.getBombShieldCount()).toBe(0);
      upgrade.addBombShieldCount(2);
      expect(upgrade.getBombShieldCount()).toBe(2);
    });

    it('should consume bomb shield when used', async () => {
      const { UpgradeSystem } = await import('../src/systems/UpgradeSystem');
      const upgrade = new UpgradeSystem();

      upgrade.addBombShieldCount(2);
      expect(upgrade.useBombShield()).toBe(true);
      expect(upgrade.getBombShieldCount()).toBe(1);
      expect(upgrade.useBombShield()).toBe(true);
      expect(upgrade.getBombShieldCount()).toBe(0);
      expect(upgrade.useBombShield()).toBe(false); // 더 이상 없음
    });

    it('should recharge bomb shield', async () => {
      const { UpgradeSystem } = await import('../src/systems/UpgradeSystem');
      const upgrade = new UpgradeSystem();

      upgrade.addBombShieldCount(3);
      upgrade.useBombShield();
      upgrade.useBombShield();
      expect(upgrade.getBombShieldCount()).toBe(1);

      upgrade.rechargeBombShield();
      expect(upgrade.getBombShieldCount()).toBe(3); // 최대로 충전
    });

    it('should track lifesteal chance', async () => {
      const { UpgradeSystem } = await import('../src/systems/UpgradeSystem');
      const upgrade = new UpgradeSystem();

      expect(upgrade.getLifestealChance()).toBe(0);
      upgrade.addLifestealChance(0.05);
      upgrade.addLifestealChance(0.05);
      expect(upgrade.getLifestealChance()).toBe(0.1);
    });

    it('should track combo heal threshold', async () => {
      const { UpgradeSystem } = await import('../src/systems/UpgradeSystem');
      const upgrade = new UpgradeSystem();

      expect(upgrade.getComboHealThreshold()).toBe(0);
      upgrade.addComboHealThreshold(1);
      expect(upgrade.getComboHealThreshold()).toBe(1);
      upgrade.addComboHealThreshold(1);
      expect(upgrade.getComboHealThreshold()).toBe(2);
    });

    it('should track wave heal amount', async () => {
      const { UpgradeSystem } = await import('../src/systems/UpgradeSystem');
      const upgrade = new UpgradeSystem();

      expect(upgrade.getWaveHealAmount()).toBe(0);
      upgrade.addWaveHealAmount(1);
      expect(upgrade.getWaveHealAmount()).toBe(1);
    });

    it('should track second chance percent with cap', async () => {
      const { UpgradeSystem } = await import('../src/systems/UpgradeSystem');
      const upgrade = new UpgradeSystem();

      expect(upgrade.getSecondChancePercent()).toBe(0);
      upgrade.addSecondChancePercent(0.5);
      expect(upgrade.getSecondChancePercent()).toBe(0.5);
      upgrade.addSecondChancePercent(0.6); // 총 1.1이지만 최대 1.0
      expect(upgrade.getSecondChancePercent()).toBe(1.0);
    });

    it('should track bomb convert heal', async () => {
      const { UpgradeSystem } = await import('../src/systems/UpgradeSystem');
      const upgrade = new UpgradeSystem();

      expect(upgrade.isBombConvertHealEnabled()).toBe(false);
      upgrade.setBombConvertHeal(true);
      expect(upgrade.isBombConvertHealEnabled()).toBe(true);
    });

    it('should track revive count', async () => {
      const { UpgradeSystem } = await import('../src/systems/UpgradeSystem');
      const upgrade = new UpgradeSystem();

      expect(upgrade.getReviveCount()).toBe(0);
      upgrade.setReviveCount(1);
      expect(upgrade.getReviveCount()).toBe(1);
    });

    it('should consume revive when used', async () => {
      const { UpgradeSystem } = await import('../src/systems/UpgradeSystem');
      const upgrade = new UpgradeSystem();

      upgrade.setReviveCount(1);
      expect(upgrade.useRevive()).toBe(true);
      expect(upgrade.getReviveCount()).toBe(0);
      expect(upgrade.useRevive()).toBe(false);
    });

    it('should track time stop enabled', async () => {
      const { UpgradeSystem } = await import('../src/systems/UpgradeSystem');
      const upgrade = new UpgradeSystem();

      expect(upgrade.isTimeStopEnabled()).toBe(false);
      upgrade.setTimeStopEnabled(true);
      expect(upgrade.isTimeStopEnabled()).toBe(true);
    });

    it('should track auto destroy enabled', async () => {
      const { UpgradeSystem } = await import('../src/systems/UpgradeSystem');
      const upgrade = new UpgradeSystem();

      expect(upgrade.isAutoDestroyEnabled()).toBe(false);
      upgrade.setAutoDestroyEnabled(true);
      expect(upgrade.isAutoDestroyEnabled()).toBe(true);
    });

    it('should track max HP bonus', async () => {
      const { UpgradeSystem } = await import('../src/systems/UpgradeSystem');
      const upgrade = new UpgradeSystem();

      expect(upgrade.getMaxHpBonus()).toBe(0);
      upgrade.addMaxHpBonus(1);
      upgrade.addMaxHpBonus(2);
      expect(upgrade.getMaxHpBonus()).toBe(3);
    });
  });

  describe('ComboSystem Combo Heal', () => {
    it('should emit combo milestone when threshold reached', async () => {
      const { ComboSystem } = await import('../src/systems/ComboSystem');
      const combo = new ComboSystem();

      // 10콤보 달성
      for (let i = 0; i < 10; i++) {
        combo.increment();
      }

      // COMBO_MILESTONE 이벤트가 발생했는지 확인
      const milestoneCall = mockEmit.mock.calls.find(
        (call) => call[0] === 'combo_milestone' && call[1] === 10
      );
      expect(milestoneCall).toBeDefined();
    });
  });

  describe('HealthSystem Integration', () => {
    it('should work with max HP bonus from upgrade', async () => {
      const { HealthSystem } = await import('../src/systems/HealthSystem');
      const { UpgradeSystem } = await import('../src/systems/UpgradeSystem');

      const upgrade = new UpgradeSystem();
      const health = new HealthSystem(5);

      // 업그레이드로 max HP 보너스 획득
      upgrade.addMaxHpBonus(2);

      // HealthSystem에 적용
      health.setMaxHp(5 + upgrade.getMaxHpBonus());
      expect(health.getMaxHp()).toBe(7);
    });

    it('should revive with upgrade system', async () => {
      const { HealthSystem } = await import('../src/systems/HealthSystem');
      const { UpgradeSystem } = await import('../src/systems/UpgradeSystem');

      const upgrade = new UpgradeSystem();
      const health = new HealthSystem(5);

      // 부활 업그레이드 획득
      upgrade.setReviveCount(1);

      // HP 0으로 사망
      health.takeDamage(5);
      expect(health.isDead()).toBe(true);

      // 부활 사용
      if (upgrade.useRevive()) {
        health.revive(3);
      }

      expect(health.getHp()).toBe(3);
      expect(health.isDead()).toBe(false);
      expect(upgrade.getReviveCount()).toBe(0);
    });
  });
});
