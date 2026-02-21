import { describe, expect, it } from 'vitest';
import { Data } from '../src/data/DataManager';
import { WaveConfigResolver } from '../src/plugins/builtin/services/wave/WaveConfigResolver';

function getWave(waveNumber: number) {
  return Data.waves.waves[waveNumber - 1];
}

function getWeight(waveNumber: number, type: string): number {
  return getWave(waveNumber).dishTypes.find((dishType) => dishType.type === type)?.weight ?? 0;
}

describe('Wave balance config', () => {
  it('has 12 predefined waves with tempo pattern', () => {
    expect(Data.waves.waves).toHaveLength(12);
  });

  it('introduces bomb at wave 6 and crystal at wave 8', () => {
    for (let w = 1; w <= 5; w++) {
      expect(getWeight(w, 'bomb')).toBe(0);
    }
    expect(getWeight(6, 'bomb')).toBeGreaterThan(0);

    for (let w = 1; w <= 7; w++) {
      expect(getWeight(w, 'crystal')).toBe(0);
    }
    expect(getWeight(8, 'crystal')).toBeGreaterThan(0);
  });

  it('uses mini dishes in recovery waves for combo learning', () => {
    expect(getWeight(2, 'mini')).toBe(0.15);
    expect(getWeight(5, 'mini')).toBe(0.35);
    expect(getWeight(8, 'mini')).toBe(0.3);
    expect(getWeight(11, 'mini')).toBe(0.3);
  });

  it('recovery waves have lower dish count and higher golden ratio than adjacent pressure waves', () => {
    expect(getWave(2).dishCount).toBeLessThan(getWave(3).dishCount);
    expect(getWeight(2, 'golden')).toBeGreaterThan(getWeight(3, 'golden'));

    expect(getWave(5).dishCount).toBeLessThan(getWave(4).dishCount);
    expect(getWeight(5, 'golden')).toBeGreaterThan(getWeight(4, 'golden'));

    expect(getWave(8).dishCount).toBeLessThan(getWave(7).dishCount);
    expect(getWeight(8, 'golden')).toBeGreaterThan(getWeight(7, 'golden'));

    expect(getWave(11).dishCount).toBeLessThan(getWave(10).dishCount);
    expect(getWeight(11, 'golden')).toBeGreaterThan(getWeight(10, 'golden'));
  });

  it('waves 1-9 have one boss, waves 10-12 have two bosses', () => {
    for (let w = 1; w <= 9; w++) {
      expect(getWave(w).bosses).toHaveLength(1);
    }
    for (let w = 10; w <= 12; w++) {
      expect(getWave(w).bosses).toHaveLength(2);
      expect(getWave(w).bosses?.some((boss) => boss.id === 'boss_left')).toBe(true);
      expect(getWave(w).bosses?.some((boss) => boss.id === 'boss_right')).toBe(true);
    }
  });

  it('all wave bosses and infinite template bosses declare entityTypeId registered in game-config', () => {
    const allowedEntityTypes = new Set(Data.gameConfig.entityTypes);
    for (const wave of Data.waves.waves) {
      for (const boss of wave.bosses ?? []) {
        expect(boss.entityTypeId, `wave ${wave.number} boss ${boss.id}`).toBeTruthy();
        expect(
          allowedEntityTypes.has(boss.entityTypeId),
          `wave ${wave.number} boss ${boss.id} uses unknown entityTypeId "${boss.entityTypeId}"`
        ).toBe(true);
      }
    }

    for (const boss of Data.waves.infiniteScaling.infiniteBossTemplate ?? []) {
      expect(boss.entityTypeId, `infinite template boss ${boss.id}`).toBeTruthy();
      expect(
        allowedEntityTypes.has(boss.entityTypeId),
        `infinite template boss ${boss.id} uses unknown entityTypeId "${boss.entityTypeId}"`
      ).toBe(true);
    }
  });

  it('wave 10 introduces dual laser (maxCount 2)', () => {
    for (let w = 1; w <= 9; w++) {
      expect(getWave(w).laser?.maxCount ?? 0).toBeLessThanOrEqual(1);
    }
    expect(getWave(10).laser?.maxCount).toBe(2);
  });

  it('matches infinite scaling rebalance values', () => {
    const scaling = Data.waves.infiniteScaling;
    expect(scaling.spawnIntervalReduction).toBe(5);
    expect(scaling.minSpawnInterval).toBe(640);
    expect(scaling.bombWeightIncrease).toBe(0.002);
    expect(scaling.maxBombWeight).toBe(0.18);
    expect(scaling.goldenWeightDecrease).toBe(0.002);
    expect(scaling.minGoldenWeight).toBe(0.16);
    expect(scaling.bossHpIncrease).toBe(200);
    expect(scaling.bossTotalHpIncrease).toBe(200);
    expect(scaling.infiniteBossCount).toBe(3);
    expect(scaling.infiniteBossFullHp).toBe(true);
    expect(scaling.infiniteBossTemplate).toHaveLength(3);
    expect(scaling.minDishCountIncrease).toBe(0);
    expect(scaling.maxMinDishCount).toBe(7);
    expect(scaling.amberStartWaveOffset).toBe(1);
    expect(scaling.amberStartWeight).toBe(0.02);
    expect(scaling.amberWeightIncrease).toBe(0.02);
    expect(scaling.maxAmberWeight).toBe(0.16);
  });

  it('all configured maxActive values are positive integers', () => {
    for (const wave of Data.waves.waves) {
      for (const dt of wave.dishTypes) {
        if (dt.maxActive != null) {
          expect(dt.maxActive, `wave ${wave.number} type ${dt.type}`).toBeGreaterThan(0);
          expect(Number.isInteger(dt.maxActive), `wave ${wave.number} type ${dt.type} integer`).toBe(true);
        }
      }
    }
    const dishTypeScaling = Data.waves.infiniteScaling.dishTypeScaling;
    if (dishTypeScaling) {
      for (const entry of dishTypeScaling) {
        if (entry.maxActive != null) {
          expect(entry.maxActive, `scaling type ${entry.type}`).toBeGreaterThan(0);
          expect(Number.isInteger(entry.maxActive), `scaling type ${entry.type} integer`).toBe(true);
        }
      }
    }
  });

  it('introduces amber from wave 13 with three full-hp bosses', () => {
    const resolver = new WaveConfigResolver();
    const wave13Config = resolver.resolveWaveConfig(13);
    const wave13AmberWeight =
      wave13Config.dishTypes.find((dishType) => dishType.type === 'amber')?.weight ?? 0;

    expect(wave13AmberWeight).toBeGreaterThan(0);
    expect(wave13Config.bosses).toHaveLength(3);

    for (let waveNumber = 13; waveNumber <= 29; waveNumber++) {
      const waveConfig = resolver.resolveWaveConfig(waveNumber);
      const totalWeight = waveConfig.dishTypes.reduce((sum, dishType) => sum + dishType.weight, 0);
      const basicWeight =
        waveConfig.dishTypes.find((dishType) => dishType.type === 'basic')?.weight ?? 0;

      expect(waveConfig.bosses).toHaveLength(3);
      expect(totalWeight).toBeCloseTo(1, 6);
      expect(basicWeight).toBeGreaterThanOrEqual(0.05);

      // each boss gets full bossTotalHp (not divided)
      const perBossHp = waveConfig.bossTotalHp / waveConfig.bosses.length;
      const baseTotalHp = getWave(12).bossTotalHp ?? 0;
      const wavesBeyond = waveNumber - 12;
      const expectedPerBoss = baseTotalHp + wavesBeyond * 200;
      expect(perBossHp).toBe(expectedPerBoss);
    }
  });
});
