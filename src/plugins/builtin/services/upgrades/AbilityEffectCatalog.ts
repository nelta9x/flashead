export const ABILITY_IDS = {
  CURSOR_SIZE: 'cursor_size',
  CRITICAL_CHANCE: 'critical_chance',
  ELECTRIC_SHOCK: 'electric_shock',
  MAGNET: 'magnet',
  MISSILE: 'missile',
  HEALTH_PACK: 'health_pack',
  ORBITING_ORB: 'orbiting_orb',
  BLACK_HOLE: 'black_hole',
  GLASS_CANNON: 'glass_cannon',
  BERSERKER: 'berserker',
  VOLATILITY: 'volatility',
} as const;

export type AbilityId = (typeof ABILITY_IDS)[keyof typeof ABILITY_IDS];

export const CURSOR_SIZE_EFFECT_KEYS = {
  SIZE_BONUS: 'sizeBonus',
  DAMAGE: 'damage',
  MISSILE_THICKNESS_BONUS: 'missileThicknessBonus',
} as const;

export const CRITICAL_CHANCE_EFFECT_KEYS = {
  CRITICAL_CHANCE: 'criticalChance',
} as const;

export const ELECTRIC_SHOCK_EFFECT_KEYS = {
  RADIUS: 'radius',
  DAMAGE: 'damage',
} as const;

export const MAGNET_EFFECT_KEYS = {
  RADIUS: 'radius',
  FORCE: 'force',
} as const;

export const MISSILE_EFFECT_KEYS = {
  DAMAGE: 'damage',
  COUNT: 'count',
} as const;

export const HEALTH_PACK_EFFECT_KEYS = {
  HP_BONUS: 'hpBonus',
  DROP_CHANCE_BONUS: 'dropChanceBonus',
} as const;

export const ORBITING_ORB_EFFECT_KEYS = {
  COUNT: 'count',
  DAMAGE: 'damage',
  SPEED: 'speed',
  RADIUS: 'radius',
  SIZE: 'size',
  HIT_INTERVAL: 'hitInterval',
  OVERCLOCK_DURATION_MS: 'overclockDurationMs',
  OVERCLOCK_SPEED_MULTIPLIER: 'overclockSpeedMultiplier',
  OVERCLOCK_MAX_STACKS: 'overclockMaxStacks',
  MAGNET_SYNERGY_PER_LEVEL: 'magnetSynergyPerLevel',
} as const;

export const BLACK_HOLE_EFFECT_KEYS = {
  DAMAGE_INTERVAL: 'damageInterval',
  DAMAGE: 'damage',
  FORCE: 'force',
  SPAWN_INTERVAL: 'spawnInterval',
  DURATION: 'duration',
  SPAWN_COUNT: 'spawnCount',
  RADIUS: 'radius',
  BOMB_CONSUME_RADIUS_RATIO: 'bombConsumeRadiusRatio',
  CONSUME_RADIUS_GROWTH_RATIO: 'consumeRadiusGrowthRatio',
  CONSUME_RADIUS_GROWTH_FLAT: 'consumeRadiusGrowthFlat',
  CONSUME_DAMAGE_GROWTH: 'consumeDamageGrowth',
  CONSUME_DURATION_GROWTH: 'consumeDurationGrowth',
} as const;

export const GLASS_CANNON_EFFECT_KEYS = {
  DAMAGE_MULTIPLIER: 'damageMultiplier',
  HP_PENALTY: 'hpPenalty',
} as const;

export const BERSERKER_EFFECT_KEYS = {
  MISSING_HP_DAMAGE_PERCENT: 'missingHpDamagePercent',
} as const;

export const VOLATILITY_EFFECT_KEYS = {
  CRIT_MULTIPLIER: 'critMultiplier',
  NON_CRIT_PENALTY: 'nonCritPenalty',
} as const;
