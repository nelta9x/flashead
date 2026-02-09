import { describe, expect, it } from 'vitest';
import { Data } from '../src/data/DataManager';
import { WaveConfigResolver } from '../src/systems/wave/WaveConfigResolver';

function getWave(waveNumber: number) {
  return Data.waves.waves[waveNumber - 1];
}

function getWeight(waveNumber: number, type: string): number {
  return getWave(waveNumber).dishTypes.find((dishType) => dishType.type === type)?.weight ?? 0;
}

describe('Wave balance config', () => {
  it('has 15 predefined waves with tempo pattern', () => {
    expect(Data.waves.waves).toHaveLength(15);
  });

  it('introduces bomb at wave 9 and crystal at wave 12', () => {
    for (let w = 1; w <= 8; w++) {
      expect(getWeight(w, 'bomb')).toBe(0);
    }
    expect(getWeight(9, 'bomb')).toBeGreaterThan(0);

    for (let w = 1; w <= 11; w++) {
      expect(getWeight(w, 'crystal')).toBe(0);
    }
    expect(getWeight(12, 'crystal')).toBeGreaterThan(0);
  });

  it('uses mini dishes in recovery waves for combo learning', () => {
    expect(getWeight(2, 'mini')).toBe(0.2);
    expect(getWeight(5, 'mini')).toBe(0.15);
    expect(getWeight(8, 'mini')).toBe(0.35);
    expect(getWeight(11, 'mini')).toBe(0.3);
    expect(getWeight(14, 'mini')).toBe(0.3);
  });

  it('recovery waves have lower dish count and higher golden ratio than adjacent pressure waves', () => {
    expect(getWave(5).dishCount).toBeLessThan(getWave(4).dishCount);
    expect(getWeight(5, 'golden')).toBeGreaterThan(getWeight(4, 'golden'));

    expect(getWave(8).dishCount).toBeLessThan(getWave(7).dishCount);
    expect(getWeight(8, 'golden')).toBeGreaterThan(getWeight(7, 'golden'));

    expect(getWave(11).dishCount).toBeLessThan(getWave(10).dishCount);
    expect(getWeight(11, 'golden')).toBeGreaterThan(getWeight(10, 'golden'));

    expect(getWave(14).dishCount).toBeLessThan(getWave(13).dishCount);
    expect(getWeight(14, 'golden')).toBeGreaterThan(getWeight(13, 'golden'));
  });

  it('waves 1-12 have one boss, waves 13-15 have two bosses', () => {
    for (let w = 1; w <= 12; w++) {
      expect(getWave(w).bosses).toHaveLength(1);
    }
    for (let w = 13; w <= 15; w++) {
      expect(getWave(w).bosses).toHaveLength(2);
      expect(getWave(w).bosses?.some((boss) => boss.id === 'boss_left')).toBe(true);
      expect(getWave(w).bosses?.some((boss) => boss.id === 'boss_right')).toBe(true);
    }
  });

  it('wave 13 introduces dual laser (maxCount 2)', () => {
    for (let w = 1; w <= 12; w++) {
      expect(getWave(w).laser?.maxCount ?? 0).toBeLessThanOrEqual(1);
    }
    expect(getWave(13).laser?.maxCount).toBe(2);
  });

  it('matches infinite scaling rebalance values', () => {
    const scaling = Data.waves.infiniteScaling;
    expect(scaling.spawnIntervalReduction).toBe(5);
    expect(scaling.minSpawnInterval).toBe(640);
    expect(scaling.bombWeightIncrease).toBe(0.002);
    expect(scaling.maxBombWeight).toBe(0.18);
    expect(scaling.goldenWeightDecrease).toBe(0.002);
    expect(scaling.minGoldenWeight).toBe(0.16);
    expect(scaling.bossHpIncrease).toBe(150);
    expect(scaling.bossTotalHpIncrease).toBe(150);
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

  it('introduces amber from wave 16 with three full-hp bosses', () => {
    const resolver = new WaveConfigResolver();
    const wave16Config = resolver.resolveWaveConfig(16);
    const wave16AmberWeight =
      wave16Config.dishTypes.find((dishType) => dishType.type === 'amber')?.weight ?? 0;

    expect(wave16AmberWeight).toBeGreaterThan(0);
    expect(wave16Config.bosses).toHaveLength(3);

    for (let waveNumber = 16; waveNumber <= 30; waveNumber++) {
      const waveConfig = resolver.resolveWaveConfig(waveNumber);
      const totalWeight = waveConfig.dishTypes.reduce((sum, dishType) => sum + dishType.weight, 0);
      const basicWeight =
        waveConfig.dishTypes.find((dishType) => dishType.type === 'basic')?.weight ?? 0;

      expect(waveConfig.bosses).toHaveLength(3);
      expect(totalWeight).toBeCloseTo(1, 6);
      expect(basicWeight).toBeGreaterThanOrEqual(0.05);

      // each boss gets full bossTotalHp (not divided)
      const perBossHp = waveConfig.bossTotalHp / waveConfig.bosses.length;
      const baseTotalHp = getWave(15).bossTotalHp ?? 0;
      const wavesBeyond = waveNumber - 15;
      const expectedPerBoss = baseTotalHp + wavesBeyond * 150;
      expect(perBossHp).toBe(expectedPerBoss);
    }
  });
});
