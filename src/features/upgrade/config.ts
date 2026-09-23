import type { Rarity } from '../../shared/types'
import { RARITY_ORDER } from '../cases/data/rarities'

/**
 * Upgrade / trade-up rules — edit here.
 *
 * 10 items of rarity R → 1 random item of rarity R+1
 * Result pool: ALL catalog items of the target rarity across every case
 *   (global pool, not tied to a single banner).
 * Within the target rarity, picks are UNIFORM (equal weight).
 * Fee: UPGRADE_FEE_RATE × average value of sacrificed items (rounded up).
 */
export const UPGRADE_COST = 10

/** Fraction of average sacrificed item value charged as Mora fee. */
export const UPGRADE_FEE_RATE = 0.1

/** Common → … → Legendary. Last entry cannot be upgraded. */
export const RARITY_LADDER: readonly Rarity[] = RARITY_ORDER

export function nextRarity(rarity: Rarity): Rarity | null {
  const index = RARITY_LADDER.indexOf(rarity)
  if (index < 0 || index >= RARITY_LADDER.length - 1) return null
  return RARITY_LADDER[index + 1]
}

export function canUpgradeRarity(rarity: Rarity): boolean {
  return nextRarity(rarity) != null
}
