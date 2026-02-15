import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  ABILITY_IDS,
  CRITICAL_CHANCE_EFFECT_KEYS,
  CURSOR_SIZE_EFFECT_KEYS,
  ELECTRIC_SHOCK_EFFECT_KEYS,
  HEALTH_PACK_EFFECT_KEYS,
  MAGNET_EFFECT_KEYS,
  MISSILE_EFFECT_KEYS,
} from '../src/plugins/builtin/services/upgrades/AbilityEffectCatalog';

// Mock constants
vi.mock('../src/data/constants', () => ({
  INITIAL_HP: 5,
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
    UPGRADE_SELECTED: 'upgrade_selected',
    HEALTH_PACK_UPGRADED: 'healthPack:upgraded',
  },
}));

describe('UpgradeSystem - 레벨 배열 기반 시스템', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('레벨 0 (미적용 상태)', () => {
    it('모든 getter가 0을 반환해야 함', async () => {
      const { UpgradeSystem } = await import('../src/plugins/builtin/services/UpgradeSystem');
      const upgrade = new UpgradeSystem();

      expect(upgrade.getEffectValue(ABILITY_IDS.CURSOR_SIZE, CURSOR_SIZE_EFFECT_KEYS.SIZE_BONUS)).toBe(0);
      expect(upgrade.getEffectValue(ABILITY_IDS.CURSOR_SIZE, CURSOR_SIZE_EFFECT_KEYS.DAMAGE)).toBe(0);
      expect(upgrade.getEffectValue(ABILITY_IDS.CURSOR_SIZE, CURSOR_SIZE_EFFECT_KEYS.MISSILE_THICKNESS_BONUS)).toBe(0);
      expect(upgrade.getAbilityLevel(ABILITY_IDS.CRITICAL_CHANCE)).toBe(0);
      expect(upgrade.getEffectValue(ABILITY_IDS.CRITICAL_CHANCE, CRITICAL_CHANCE_EFFECT_KEYS.CRITICAL_CHANCE)).toBe(0);
      expect(upgrade.getAbilityLevel(ABILITY_IDS.ELECTRIC_SHOCK)).toBe(0);
      expect(upgrade.getEffectValue(ABILITY_IDS.ELECTRIC_SHOCK, ELECTRIC_SHOCK_EFFECT_KEYS.RADIUS)).toBe(0);
      expect(upgrade.getEffectValue(ABILITY_IDS.ELECTRIC_SHOCK, ELECTRIC_SHOCK_EFFECT_KEYS.DAMAGE)).toBe(0);
      expect(upgrade.getAbilityLevel(ABILITY_IDS.MAGNET)).toBe(0);
      expect(upgrade.getEffectValue(ABILITY_IDS.MAGNET, MAGNET_EFFECT_KEYS.RADIUS)).toBe(0);
      expect(upgrade.getEffectValue(ABILITY_IDS.MAGNET, MAGNET_EFFECT_KEYS.FORCE)).toBe(0);
      expect(upgrade.getAbilityLevel(ABILITY_IDS.MISSILE)).toBe(0);
      expect(upgrade.getEffectValue(ABILITY_IDS.MISSILE, MISSILE_EFFECT_KEYS.DAMAGE)).toBe(0);
      expect(upgrade.getEffectValue(ABILITY_IDS.MISSILE, MISSILE_EFFECT_KEYS.COUNT)).toBe(0);
      expect(upgrade.getAbilityLevel(ABILITY_IDS.BLACK_HOLE)).toBe(0);
      expect(upgrade.getLevelData(ABILITY_IDS.BLACK_HOLE)).toBeNull();
    });
  });

  describe('확률/데이터 연동 검증', () => {
    it('orbiting_orb hitInterval should be loaded from data', async () => {
      const { UpgradeSystem } = await import('../src/plugins/builtin/services/UpgradeSystem');
      const upgrade = new UpgradeSystem();

      expect(upgrade.getSystemUpgrade('orbiting_orb')?.hitInterval).toBe(900);
    });

    it('orbiting_orb overclock config should be loaded from data', async () => {
      const { UpgradeSystem } = await import('../src/plugins/builtin/services/UpgradeSystem');
      const upgrade = new UpgradeSystem();
      const orbUpgrade = upgrade.getSystemUpgrade('orbiting_orb');

      expect(orbUpgrade?.overclockDurationMs).toBe(3000);
      expect(orbUpgrade?.overclockSpeedMultiplier).toBe(2);
      expect(orbUpgrade?.overclockMaxStacks).toBe(3);
    });

    it('health_pack 스택은 희귀도 진행 카운트에서 제외되어야 함', async () => {
      const { UpgradeSystem, UPGRADES } = await import('../src/plugins/builtin/services/UpgradeSystem');
      const { Data } = await import('../src/data/DataManager');
      const upgrade = new UpgradeSystem();

      const hpUpgrade = UPGRADES.find((u) => u.id === 'health_pack')!;
      const cursorUpgrade = UPGRADES.find((u) => u.id === 'cursor_size')!;
      const raritySpy = vi.spyOn(Data, 'getRarityWeights');

      // health_pack은 카운트 제외
      upgrade.applyUpgrade(hpUpgrade);
      upgrade.applyUpgrade(hpUpgrade);
      upgrade.getRandomUpgrades(3);
      expect(raritySpy).toHaveBeenLastCalledWith(0);

      // 일반 업그레이드는 카운트 포함
      upgrade.applyUpgrade(cursorUpgrade);
      upgrade.applyUpgrade(cursorUpgrade);
      upgrade.applyUpgrade(cursorUpgrade);
      upgrade.getRandomUpgrades(3);
      expect(raritySpy).toHaveBeenLastCalledWith(3);
    });
  });

  describe('커서 크기 (cursor_size)', () => {
    it('레벨 1 수치 확인', async () => {
      const { UpgradeSystem, UPGRADES } = await import('../src/plugins/builtin/services/UpgradeSystem');
      const upgrade = new UpgradeSystem();
      const cursorUpgrade = UPGRADES.find((u) => u.id === 'cursor_size')!;

      upgrade.applyUpgrade(cursorUpgrade);
      expect(upgrade.getUpgradeStack('cursor_size')).toBe(1);
      expect(upgrade.getEffectValue(ABILITY_IDS.CURSOR_SIZE, CURSOR_SIZE_EFFECT_KEYS.SIZE_BONUS)).toBeCloseTo(0.4);
      expect(upgrade.getEffectValue(ABILITY_IDS.CURSOR_SIZE, CURSOR_SIZE_EFFECT_KEYS.DAMAGE)).toBe(3);
      expect(upgrade.getEffectValue(ABILITY_IDS.CURSOR_SIZE, CURSOR_SIZE_EFFECT_KEYS.MISSILE_THICKNESS_BONUS)).toBeCloseTo(0.25);
    });

    it('레벨 3 (맥스) 수치 확인', async () => {
      const { UpgradeSystem, UPGRADES } = await import('../src/plugins/builtin/services/UpgradeSystem');
      const upgrade = new UpgradeSystem();
      const cursorUpgrade = UPGRADES.find((u) => u.id === 'cursor_size')!;

      for (let i = 0; i < 3; i++) upgrade.applyUpgrade(cursorUpgrade);
      expect(upgrade.getUpgradeStack('cursor_size')).toBe(3);
      expect(upgrade.getEffectValue(ABILITY_IDS.CURSOR_SIZE, CURSOR_SIZE_EFFECT_KEYS.SIZE_BONUS)).toBeCloseTo(0.5);
      expect(upgrade.getEffectValue(ABILITY_IDS.CURSOR_SIZE, CURSOR_SIZE_EFFECT_KEYS.DAMAGE)).toBe(10);
      expect(upgrade.getEffectValue(ABILITY_IDS.CURSOR_SIZE, CURSOR_SIZE_EFFECT_KEYS.MISSILE_THICKNESS_BONUS)).toBeCloseTo(1.0);
    });
  });

  describe('치명타 확률 (critical_chance)', () => {
    it('레벨 1 수치 확인', async () => {
      const { UpgradeSystem, UPGRADES } = await import('../src/plugins/builtin/services/UpgradeSystem');
      const upgrade = new UpgradeSystem();
      const criticalUpgrade = UPGRADES.find((u) => u.id === 'critical_chance')!;

      upgrade.applyUpgrade(criticalUpgrade);
      expect(upgrade.getAbilityLevel(ABILITY_IDS.CRITICAL_CHANCE)).toBe(1);
      expect(upgrade.getEffectValue(ABILITY_IDS.CRITICAL_CHANCE, CRITICAL_CHANCE_EFFECT_KEYS.CRITICAL_CHANCE)).toBeCloseTo(0.10);
    });

    it('레벨 5 수치 확인', async () => {
      const { UpgradeSystem, UPGRADES } = await import('../src/plugins/builtin/services/UpgradeSystem');
      const upgrade = new UpgradeSystem();
      const criticalUpgrade = UPGRADES.find((u) => u.id === 'critical_chance')!;

      for (let i = 0; i < 5; i++) upgrade.applyUpgrade(criticalUpgrade);
      expect(upgrade.getAbilityLevel(ABILITY_IDS.CRITICAL_CHANCE)).toBe(5);
      expect(upgrade.getEffectValue(ABILITY_IDS.CRITICAL_CHANCE, CRITICAL_CHANCE_EFFECT_KEYS.CRITICAL_CHANCE)).toBeCloseTo(0.50);
    });
  });

  describe('전기 충격 (electric_shock)', () => {
    it('레벨 1 수치 확인', async () => {
      const { UpgradeSystem, UPGRADES } = await import('../src/plugins/builtin/services/UpgradeSystem');
      const upgrade = new UpgradeSystem();
      const electricUpgrade = UPGRADES.find((u) => u.id === 'electric_shock')!;

      upgrade.applyUpgrade(electricUpgrade);
      expect(upgrade.getAbilityLevel(ABILITY_IDS.ELECTRIC_SHOCK)).toBe(1);
      expect(upgrade.getEffectValue(ABILITY_IDS.ELECTRIC_SHOCK, ELECTRIC_SHOCK_EFFECT_KEYS.RADIUS)).toBe(320);
      expect(upgrade.getEffectValue(ABILITY_IDS.ELECTRIC_SHOCK, ELECTRIC_SHOCK_EFFECT_KEYS.DAMAGE)).toBe(2);
    });

    it('레벨 3 수치 확인', async () => {
      const { UpgradeSystem, UPGRADES } = await import('../src/plugins/builtin/services/UpgradeSystem');
      const upgrade = new UpgradeSystem();
      const electricUpgrade = UPGRADES.find((u) => u.id === 'electric_shock')!;

      for (let i = 0; i < 3; i++) upgrade.applyUpgrade(electricUpgrade);
      expect(upgrade.getEffectValue(ABILITY_IDS.ELECTRIC_SHOCK, ELECTRIC_SHOCK_EFFECT_KEYS.RADIUS)).toBe(400);
      expect(upgrade.getEffectValue(ABILITY_IDS.ELECTRIC_SHOCK, ELECTRIC_SHOCK_EFFECT_KEYS.DAMAGE)).toBe(4);
    });

    it('레벨 5 수치 확인', async () => {
      const { UpgradeSystem, UPGRADES } = await import('../src/plugins/builtin/services/UpgradeSystem');
      const upgrade = new UpgradeSystem();
      const electricUpgrade = UPGRADES.find((u) => u.id === 'electric_shock')!;

      for (let i = 0; i < 5; i++) upgrade.applyUpgrade(electricUpgrade);
      expect(upgrade.getEffectValue(ABILITY_IDS.ELECTRIC_SHOCK, ELECTRIC_SHOCK_EFFECT_KEYS.RADIUS)).toBe(600);
      expect(upgrade.getEffectValue(ABILITY_IDS.ELECTRIC_SHOCK, ELECTRIC_SHOCK_EFFECT_KEYS.DAMAGE)).toBe(5);
    });
  });

  describe('자기장 (magnet)', () => {
    it('레벨 1 수치 확인', async () => {
      const { UpgradeSystem, UPGRADES } = await import('../src/plugins/builtin/services/UpgradeSystem');
      const upgrade = new UpgradeSystem();
      const magnetUpgrade = UPGRADES.find((u) => u.id === 'magnet')!;

      upgrade.applyUpgrade(magnetUpgrade);
      expect(upgrade.getAbilityLevel(ABILITY_IDS.MAGNET)).toBe(1);
      expect(upgrade.getEffectValue(ABILITY_IDS.MAGNET, MAGNET_EFFECT_KEYS.RADIUS)).toBe(180);
      expect(upgrade.getEffectValue(ABILITY_IDS.MAGNET, MAGNET_EFFECT_KEYS.FORCE)).toBe(300);
    });

    it('레벨 5 수치 확인', async () => {
      const { UpgradeSystem, UPGRADES } = await import('../src/plugins/builtin/services/UpgradeSystem');
      const upgrade = new UpgradeSystem();
      const magnetUpgrade = UPGRADES.find((u) => u.id === 'magnet')!;

      for (let i = 0; i < 5; i++) upgrade.applyUpgrade(magnetUpgrade);
      expect(upgrade.getEffectValue(ABILITY_IDS.MAGNET, MAGNET_EFFECT_KEYS.RADIUS)).toBe(260);
      expect(upgrade.getEffectValue(ABILITY_IDS.MAGNET, MAGNET_EFFECT_KEYS.FORCE)).toBe(380);
    });
  });

  describe('미사일 (missile)', () => {
    it('레벨 1 수치 확인', async () => {
      const { UpgradeSystem, UPGRADES } = await import('../src/plugins/builtin/services/UpgradeSystem');
      const upgrade = new UpgradeSystem();
      const missileUpgrade = UPGRADES.find((u) => u.id === 'missile')!;

      upgrade.applyUpgrade(missileUpgrade);
      expect(upgrade.getAbilityLevel(ABILITY_IDS.MISSILE)).toBe(1);
      expect(upgrade.getEffectValue(ABILITY_IDS.MISSILE, MISSILE_EFFECT_KEYS.DAMAGE)).toBe(80);
      expect(upgrade.getEffectValue(ABILITY_IDS.MISSILE, MISSILE_EFFECT_KEYS.COUNT)).toBe(2);
    });

    it('레벨 3 수치 확인', async () => {
      const { UpgradeSystem, UPGRADES } = await import('../src/plugins/builtin/services/UpgradeSystem');
      const upgrade = new UpgradeSystem();
      const missileUpgrade = UPGRADES.find((u) => u.id === 'missile')!;

      for (let i = 0; i < 3; i++) upgrade.applyUpgrade(missileUpgrade);
      expect(upgrade.getEffectValue(ABILITY_IDS.MISSILE, MISSILE_EFFECT_KEYS.DAMAGE)).toBe(93);
      expect(upgrade.getEffectValue(ABILITY_IDS.MISSILE, MISSILE_EFFECT_KEYS.COUNT)).toBe(3);
    });

    it('레벨 2~5 수치 진행 확인', async () => {
      const { UpgradeSystem, UPGRADES } = await import('../src/plugins/builtin/services/UpgradeSystem');
      const upgrade = new UpgradeSystem();
      const missileUpgrade = UPGRADES.find((u) => u.id === 'missile')!;

      // 레벨 2: 발당 피해 증가
      for (let i = 0; i < 2; i++) upgrade.applyUpgrade(missileUpgrade);
      expect(upgrade.getEffectValue(ABILITY_IDS.MISSILE, MISSILE_EFFECT_KEYS.DAMAGE)).toBe(110);
      expect(upgrade.getEffectValue(ABILITY_IDS.MISSILE, MISSILE_EFFECT_KEYS.COUNT)).toBe(2);

      // 레벨 3: 미사일 수 증가, 발당 피해 감소
      upgrade.applyUpgrade(missileUpgrade);
      expect(upgrade.getEffectValue(ABILITY_IDS.MISSILE, MISSILE_EFFECT_KEYS.COUNT)).toBe(3);
      expect(upgrade.getEffectValue(ABILITY_IDS.MISSILE, MISSILE_EFFECT_KEYS.DAMAGE)).toBe(93);

      // 레벨 4: 미사일 수 증가, 발당 피해 감소
      upgrade.applyUpgrade(missileUpgrade);
      expect(upgrade.getEffectValue(ABILITY_IDS.MISSILE, MISSILE_EFFECT_KEYS.COUNT)).toBe(4);
      expect(upgrade.getEffectValue(ABILITY_IDS.MISSILE, MISSILE_EFFECT_KEYS.DAMAGE)).toBe(85);

      // 레벨 5: 미사일 수 증가, 발당 피해 감소
      upgrade.applyUpgrade(missileUpgrade);
      expect(upgrade.getEffectValue(ABILITY_IDS.MISSILE, MISSILE_EFFECT_KEYS.COUNT)).toBe(5);
      expect(upgrade.getEffectValue(ABILITY_IDS.MISSILE, MISSILE_EFFECT_KEYS.DAMAGE)).toBe(80);
    });

    it('강한 강화 구간이 L2->L3, L4->L5에 존재해야 함', async () => {
      const { UpgradeSystem, UPGRADES } = await import('../src/plugins/builtin/services/UpgradeSystem');
      const upgrade = new UpgradeSystem();
      const missileUpgrade = UPGRADES.find((u) => u.id === 'missile')!;

      const totalDamageByLevel: number[] = [];
      for (let i = 0; i < 5; i++) {
        upgrade.applyUpgrade(missileUpgrade);
        totalDamageByLevel.push(upgrade.getEffectValue(ABILITY_IDS.MISSILE, MISSILE_EFFECT_KEYS.DAMAGE) * upgrade.getEffectValue(ABILITY_IDS.MISSILE, MISSILE_EFFECT_KEYS.COUNT));
      }

      // 총 데미지가 레벨마다 증가해야 함
      for (let i = 1; i < totalDamageByLevel.length; i++) {
        expect(totalDamageByLevel[i]).toBeGreaterThan(totalDamageByLevel[i - 1]);
      }
    });

    it('최대 레벨이 5에서 캡되어야 함', async () => {
      const { UpgradeSystem, UPGRADES } = await import('../src/plugins/builtin/services/UpgradeSystem');
      const upgrade = new UpgradeSystem();
      const missileUpgrade = UPGRADES.find((u) => u.id === 'missile')!;

      for (let i = 0; i < 8; i++) upgrade.applyUpgrade(missileUpgrade);
      expect(upgrade.getAbilityLevel(ABILITY_IDS.MISSILE)).toBe(5);
      expect(upgrade.getEffectValue(ABILITY_IDS.MISSILE, MISSILE_EFFECT_KEYS.DAMAGE)).toBe(80);
      expect(upgrade.getEffectValue(ABILITY_IDS.MISSILE, MISSILE_EFFECT_KEYS.COUNT)).toBe(5);
    });
  });

  describe('블랙홀 (black_hole)', () => {
    it('레벨 1 수치 확인', async () => {
      const { UpgradeSystem, UPGRADES } = await import('../src/plugins/builtin/services/UpgradeSystem');
      const upgrade = new UpgradeSystem();
      const blackHoleUpgrade = UPGRADES.find((u) => u.id === 'black_hole')!;

      upgrade.applyUpgrade(blackHoleUpgrade);
      expect(upgrade.getAbilityLevel(ABILITY_IDS.BLACK_HOLE)).toBe(1);
      expect(upgrade.getLevelData(ABILITY_IDS.BLACK_HOLE)).toEqual({
        damageInterval: 300,
        damage: 1,
        force: 260,
        spawnInterval: 7600,
        duration: 7600,
        spawnCount: 1,
        radius: 210,
        bombConsumeRadiusRatio: 0.35,
        consumeRadiusGrowthRatio: 0,
        consumeRadiusGrowthFlat: 5,
        consumeDamageGrowth: 1,
        consumeDurationGrowth: 500,
      });
    });

    it('레벨 5 수치 확인', async () => {
      const { UpgradeSystem, UPGRADES } = await import('../src/plugins/builtin/services/UpgradeSystem');
      const upgrade = new UpgradeSystem();
      const blackHoleUpgrade = UPGRADES.find((u) => u.id === 'black_hole')!;

      for (let i = 0; i < 5; i++) upgrade.applyUpgrade(blackHoleUpgrade);

      expect(upgrade.getAbilityLevel(ABILITY_IDS.BLACK_HOLE)).toBe(5);
      expect(upgrade.getLevelData(ABILITY_IDS.BLACK_HOLE)).toEqual({
        damageInterval: 200,
        damage: 5,
        force: 340,
        spawnInterval: 6400,
        duration: 6400,
        spawnCount: 1,
        radius: 330,
        bombConsumeRadiusRatio: 0.75,
        consumeRadiusGrowthRatio: 0,
        consumeRadiusGrowthFlat: 5,
        consumeDamageGrowth: 1,
        consumeDurationGrowth: 500,
      });
    });
  });

  describe('헬스팩 (health_pack)', () => {
    it('레벨 1 수치 확인 및 이벤트 발생', async () => {
      const { UpgradeSystem, UPGRADES } = await import('../src/plugins/builtin/services/UpgradeSystem');
      const upgrade = new UpgradeSystem();
      const hpUpgrade = UPGRADES.find((u) => u.id === 'health_pack')!;

      upgrade.applyUpgrade(hpUpgrade);
      expect(upgrade.getAbilityLevel(ABILITY_IDS.HEALTH_PACK)).toBe(1);
      expect(upgrade.getEffectValue(ABILITY_IDS.HEALTH_PACK, HEALTH_PACK_EFFECT_KEYS.DROP_CHANCE_BONUS)).toBeCloseTo(0.03);

      // 이벤트 발생 확인
      expect(mockEmit).toHaveBeenCalledWith('healthPack:upgraded', { hpBonus: 1 });
    });

    it('레벨 3 수치 확인', async () => {
      const { UpgradeSystem, UPGRADES } = await import('../src/plugins/builtin/services/UpgradeSystem');
      const upgrade = new UpgradeSystem();
      const hpUpgrade = UPGRADES.find((u) => u.id === 'health_pack')!;

      for (let i = 0; i < 3; i++) upgrade.applyUpgrade(hpUpgrade);
      expect(upgrade.getAbilityLevel(ABILITY_IDS.HEALTH_PACK)).toBe(3);
      expect(upgrade.getEffectValue(ABILITY_IDS.HEALTH_PACK, HEALTH_PACK_EFFECT_KEYS.DROP_CHANCE_BONUS)).toBeCloseTo(0.09);

      // 마지막 호출 이벤트 확인
      expect(mockEmit).toHaveBeenLastCalledWith('healthPack:upgraded', { hpBonus: 3 });
    });
  });

  describe('스택 제한', () => {
    it('7회 적용해도 levels.length(3)에서 캡', async () => {
      const { UpgradeSystem, UPGRADES } = await import('../src/plugins/builtin/services/UpgradeSystem');
      const upgrade = new UpgradeSystem();
      const cursorUpgrade = UPGRADES.find((u) => u.id === 'cursor_size')!;

      for (let i = 0; i < 7; i++) upgrade.applyUpgrade(cursorUpgrade);

      expect(upgrade.getUpgradeStack('cursor_size')).toBe(3);
      expect(upgrade.getEffectValue(ABILITY_IDS.CURSOR_SIZE, CURSOR_SIZE_EFFECT_KEYS.SIZE_BONUS)).toBeCloseTo(0.5);
      expect(upgrade.getEffectValue(ABILITY_IDS.CURSOR_SIZE, CURSOR_SIZE_EFFECT_KEYS.DAMAGE)).toBe(10);
    });

    it('모든 어빌리티 maxStack이 데이터의 levels.length와 일치', async () => {
      const { UPGRADES } = await import('../src/plugins/builtin/services/UpgradeSystem');
      const { Data } = await import('../src/data/DataManager');

      const levelUpgrades = UPGRADES.filter((u) => u.id !== 'health_pack');

      for (const upgrade of levelUpgrades) {
        const upgradeData = Data.upgrades.system.find((u) => u.id === upgrade.id);
        expect(upgrade.maxStack).toBe(upgradeData?.levels?.length);
      }
    });
  });

  describe('리셋', () => {
    it('reset() 후 모든 스택 0, 모든 getter 0', async () => {
      const { UpgradeSystem, UPGRADES } = await import('../src/plugins/builtin/services/UpgradeSystem');
      const upgrade = new UpgradeSystem();

      // 모든 어빌리티 적용
      for (const u of UPGRADES) {
        if (u.id !== 'health_pack') {
          for (let i = 0; i < 3; i++) upgrade.applyUpgrade(u);
        }
      }

      // 리셋
      upgrade.reset();

      // 확인
      expect(upgrade.getEffectValue(ABILITY_IDS.CURSOR_SIZE, CURSOR_SIZE_EFFECT_KEYS.SIZE_BONUS)).toBe(0);
      expect(upgrade.getEffectValue(ABILITY_IDS.CURSOR_SIZE, CURSOR_SIZE_EFFECT_KEYS.DAMAGE)).toBe(0);
      expect(upgrade.getAbilityLevel(ABILITY_IDS.CRITICAL_CHANCE)).toBe(0);
      expect(upgrade.getEffectValue(ABILITY_IDS.CRITICAL_CHANCE, CRITICAL_CHANCE_EFFECT_KEYS.CRITICAL_CHANCE)).toBe(0);
      expect(upgrade.getAbilityLevel(ABILITY_IDS.ELECTRIC_SHOCK)).toBe(0);
      expect(upgrade.getEffectValue(ABILITY_IDS.ELECTRIC_SHOCK, ELECTRIC_SHOCK_EFFECT_KEYS.RADIUS)).toBe(0);
      expect(upgrade.getEffectValue(ABILITY_IDS.ELECTRIC_SHOCK, ELECTRIC_SHOCK_EFFECT_KEYS.DAMAGE)).toBe(0);
      expect(upgrade.getAbilityLevel(ABILITY_IDS.MAGNET)).toBe(0);
      expect(upgrade.getEffectValue(ABILITY_IDS.MAGNET, MAGNET_EFFECT_KEYS.RADIUS)).toBe(0);
      expect(upgrade.getEffectValue(ABILITY_IDS.MAGNET, MAGNET_EFFECT_KEYS.FORCE)).toBe(0);
      expect(upgrade.getAbilityLevel(ABILITY_IDS.MISSILE)).toBe(0);
      expect(upgrade.getEffectValue(ABILITY_IDS.MISSILE, MISSILE_EFFECT_KEYS.DAMAGE)).toBe(0);
      expect(upgrade.getEffectValue(ABILITY_IDS.MISSILE, MISSILE_EFFECT_KEYS.COUNT)).toBe(0);
      expect(upgrade.getAbilityLevel(ABILITY_IDS.BLACK_HOLE)).toBe(0);
      expect(upgrade.getLevelData(ABILITY_IDS.BLACK_HOLE)).toBeNull();
    });
  });

  describe('로케일 및 템플릿 치환 검증', () => {
    it('모든 시스템 업그레이드의 이름과 설명 키가 존재해야 함', async () => {
      const { Data } = await import('../src/data/DataManager');
      const languages: ('en' | 'ko')[] = ['en', 'ko'];

      for (const lang of languages) {
        Data.setLanguage(lang);
        const locale = Data.locales[lang];
        expect(locale['upgrade.card.level_transition']).toBeDefined();
        expect(locale['upgrade.card.delta_format']).toBeDefined();
        expect(
          locale['upgrade.orbiting_orb.selection_hint'],
          `Missing selection_hint for orbiting_orb in ${lang}`
        ).toBeDefined();

        for (const upgrade of Data.upgrades.system) {
          expect(
            locale[`upgrade.${upgrade.id}.name`],
            `Missing name for ${upgrade.id} in ${lang}`
          ).toBeDefined();
          expect(
            locale[`upgrade.${upgrade.id}.desc`],
            `Missing desc for ${upgrade.id} in ${lang}`
          ).toBeDefined();
          if (upgrade.descriptionTemplate) {
            expect(
              locale[`upgrade.${upgrade.id}.desc_template`],
              `Missing desc_template for ${upgrade.id} in ${lang}`
            ).toBeDefined();
          }

          expect(upgrade.previewDisplay.stats.length, `Missing previewDisplay stats for ${upgrade.id}`).toBeGreaterThan(0);

          for (const stat of upgrade.previewDisplay.stats) {
            expect(
              locale[stat.labelKey],
              `Missing stat label "${stat.labelKey}" for ${upgrade.id} in ${lang}`
            ).toBeDefined();
          }
        }
      }
    });

    it('모든 단계에서 설명(getFormattedDescription)에 미치환 태그가 없어야 함', async () => {
      const { UpgradeSystem, UPGRADES } = await import('../src/plugins/builtin/services/UpgradeSystem');
      const { Data } = await import('../src/data/DataManager');
      const languages: ('en' | 'ko')[] = ['en', 'ko'];

      for (const lang of languages) {
        Data.setLanguage(lang);
        const upgradeSystem = new UpgradeSystem();

        for (const upgradeData of Data.upgrades.system) {
          const upgradeObj = UPGRADES.find((u) => u.id === upgradeData.id)!;

          // 0레벨부터 만렙까지 확인
          const maxLevel = upgradeData.levels ? upgradeData.levels.length : 1;
          for (let level = 0; level <= maxLevel; level++) {
            if (level > 0) upgradeSystem.applyUpgrade(upgradeObj);

            const desc = upgradeSystem.getFormattedDescription(upgradeData.id);
            // { 또는 } 가 포함되어 있으면 치환 실패로 간주
            expect(
              desc,
              `Unreplaced tag in ${upgradeData.id} (Level ${level}, ${lang}): ${desc}`
            ).not.toMatch(/\{|\}/);
          }
        }
      }
    });

    it('모든 단계에서 미리보기(getPreviewCardModel) 구조가 유효해야 함', async () => {
      const { UpgradeSystem, UPGRADES } = await import('../src/plugins/builtin/services/UpgradeSystem');
      const { Data } = await import('../src/data/DataManager');
      const languages: ('en' | 'ko')[] = ['en', 'ko'];

      for (const lang of languages) {
        Data.setLanguage(lang);
        const upgradeSystem = new UpgradeSystem();

        for (const upgradeData of Data.upgrades.system) {
          const upgradeObj = UPGRADES.find((u) => u.id === upgradeData.id)!;

          const maxLevel = upgradeData.levels ? upgradeData.levels.length : 1;
          for (let level = 0; level < maxLevel; level++) {
            const preview = upgradeSystem.getPreviewCardModel(upgradeData.id);
            expect(preview, `Missing preview model for ${upgradeData.id} (${lang}, level ${level})`).not.toBeNull();
            expect(preview?.rows.length, `Missing preview rows for ${upgradeData.id}`).toBeGreaterThan(0);
            if (!preview) {
              continue;
            }

            for (const row of preview.rows) {
              expect(row.label, `Missing row label in ${upgradeData.id}`).toBeTruthy();
              expect(row.currentDisplay).not.toMatch(/\{|\}/);
              expect(row.nextDisplay).not.toMatch(/\{|\}/);
              expect(row.deltaDisplay).not.toMatch(/\{|\}/);
              expect(row.currentValue).not.toBe(row.nextValue);
            }

            upgradeSystem.applyUpgrade(upgradeObj);
          }
        }
      }
    });
  });
});
