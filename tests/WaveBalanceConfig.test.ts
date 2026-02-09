import { describe, expect, it } from 'vitest';
import { Data } from '../src/data/DataManager';

function getWave(waveNumber: number) {
  return Data.waves.waves[waveNumber - 1];
}

function getWeight(waveNumber: number, type: string): number {
  return getWave(waveNumber).dishTypes.find((dishType) => dishType.type === type)?.weight ?? 0;
}

describe('Wave balance config', () => {
  it('locks wave 7~8 to basic/golden/bomb without crystal', () => {
    expect(getWave(7).dishTypes).toEqual([
      { type: 'basic', weight: 0.72 },
      { type: 'golden', weight: 0.18 },
      { type: 'bomb', weight: 0.1 },
    ]);
    expect(getWave(8).dishTypes).toEqual([
      { type: 'basic', weight: 0.62 },
      { type: 'golden', weight: 0.23 },
      { type: 'bomb', weight: 0.15 },
    ]);
    expect(getWeight(7, 'crystal')).toBe(0);
    expect(getWeight(8, 'crystal')).toBe(0);
  });

  it('reintroduces crystal at wave 9 and reduces bomb vs wave 8', () => {
    expect(getWeight(9, 'crystal')).toBeGreaterThan(0);
    expect(getWeight(9, 'bomb')).toBeLessThan(getWeight(8, 'bomb'));
    expect(getWave(9).dishTypes).toEqual([
      { type: 'basic', weight: 0.48 },
      { type: 'golden', weight: 0.3 },
      { type: 'crystal', weight: 0.1 },
      { type: 'bomb', weight: 0.12 },
    ]);
  });

  it('matches wave 10~12 pacing, dish mix, boss hp, and laser specs', () => {
    expect(getWave(10).spawnInterval).toBe(780);
    expect(getWave(10).bossTotalHp).toBe(2500);
    expect(getWave(10).dishTypes).toEqual([
      { type: 'basic', weight: 0.36 },
      { type: 'golden', weight: 0.24 },
      { type: 'crystal', weight: 0.14 },
      { type: 'bomb', weight: 0.14 },
      { type: 'amber', weight: 0.12 },
    ]);
    expect(getWave(10).laser).toEqual({ maxCount: 3, minInterval: 3000, maxInterval: 5800 });
    expect(getWave(10).bosses?.map((boss) => boss.laser)).toEqual([
      { maxCount: 1, minInterval: 3200, maxInterval: 6200 },
      { maxCount: 1, minInterval: 3200, maxInterval: 6200 },
    ]);

    expect(getWave(11).spawnInterval).toBe(740);
    expect(getWave(11).bossTotalHp).toBe(3100);
    expect(getWave(11).dishTypes).toEqual([
      { type: 'basic', weight: 0.3 },
      { type: 'golden', weight: 0.22 },
      { type: 'crystal', weight: 0.17 },
      { type: 'bomb', weight: 0.16 },
      { type: 'amber', weight: 0.15 },
    ]);
    expect(getWave(11).laser).toEqual({ maxCount: 3, minInterval: 2800, maxInterval: 5400 });
    expect(getWave(11).bosses?.map((boss) => boss.laser)).toEqual([
      { maxCount: 1, minInterval: 3000, maxInterval: 5600 },
      { maxCount: 1, minInterval: 3000, maxInterval: 5600 },
    ]);

    expect(getWave(12).spawnInterval).toBe(700);
    expect(getWave(12).bossTotalHp).toBe(3900);
    expect(getWave(12).dishTypes).toEqual([
      { type: 'basic', weight: 0.24 },
      { type: 'golden', weight: 0.2 },
      { type: 'crystal', weight: 0.2 },
      { type: 'bomb', weight: 0.18 },
      { type: 'amber', weight: 0.18 },
    ]);
    expect(getWave(12).laser).toEqual({ maxCount: 4, minInterval: 2500, maxInterval: 5000 });
    expect(getWave(12).bosses?.map((boss) => boss.laser)).toEqual([
      { maxCount: 1, minInterval: 2700, maxInterval: 5200 },
      { maxCount: 1, minInterval: 2600, maxInterval: 5000 },
      { maxCount: 1, minInterval: 2700, maxInterval: 5200 },
    ]);
  });

  it('matches infinite scaling rebalance values', () => {
    expect(Data.waves.infiniteScaling).toEqual({
      spawnIntervalReduction: 6,
      minSpawnInterval: 320,
      bombWeightIncrease: 0.008,
      maxBombWeight: 0.24,
      goldenWeightDecrease: 0.002,
      minGoldenWeight: 0.18,
      bossHpIncrease: 2200,
      bossTotalHpIncrease: 2200,
      infiniteBossCount: 3,
      minDishCountIncrease: 1,
      maxMinDishCount: 11,
    });
  });
});
