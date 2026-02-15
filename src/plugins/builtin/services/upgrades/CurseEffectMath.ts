export interface GlobalDamageMultiplierInput {
  currentHp: number;
  maxHp: number;
  glassCannonDamageMultiplier: number;
  berserkerMissingHpDamagePercent: number;
}

/**
 * Computes aggregate damage multiplier from curse effects.
 * - glass cannon: flat additive multiplier
 * - berserker: additive multiplier per missing HP
 */
export function computeGlobalDamageMultiplier(input: GlobalDamageMultiplierInput): number {
  const maxHp = Math.max(0, input.maxHp);
  const currentHp = Math.max(0, input.currentHp);

  let multiplier = 1;
  if (input.glassCannonDamageMultiplier > 0) {
    multiplier += input.glassCannonDamageMultiplier;
  }

  if (input.berserkerMissingHpDamagePercent > 0 && maxHp > 0) {
    const missingHp = Math.max(0, maxHp - currentHp);
    multiplier += input.berserkerMissingHpDamagePercent * missingHp;
  }

  return multiplier;
}
