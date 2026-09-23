import { CASES } from '../../cases/data/cases'
import { createUid, pickWeighted } from '../../../shared/lib/random'
import type { CaseItem, InventoryItem, Rarity } from '../../../shared/types'
import {
  UPGRADE_COST,
  UPGRADE_FEE_RATE,
  canUpgradeRarity,
  nextRarity,
} from '../config'

export interface UpgradeCandidate extends CaseItem {
  caseId: string
}

/** Global pool: every unique item of this rarity from all cases. */
export function getUpgradePool(targetRarity: Rarity): UpgradeCandidate[] {
  const seen = new Set<string>()
  const pool: UpgradeCandidate[] = []

  for (const caseDef of CASES) {
    for (const item of caseDef.items) {
      if (item.rarity !== targetRarity) continue
      if (seen.has(item.id)) continue
      seen.add(item.id)
      pool.push({ ...item, caseId: caseDef.id })
    }
  }

  return pool
}

export function calcUpgradeFee(sacrificed: InventoryItem[]): number {
  if (sacrificed.length === 0) return 0
  const avg =
    sacrificed.reduce((sum, item) => sum + item.value, 0) / sacrificed.length
  return Math.ceil(avg * UPGRADE_FEE_RATE)
}

export type UpgradeValidation =
  | { ok: true; targetRarity: Rarity; fee: number; pool: UpgradeCandidate[] }
  | {
      ok: false
      reason:
        | 'count'
        | 'mixed'
        | 'legendary'
        | 'empty_pool'
        | 'insufficient_funds'
    }

export function validateUpgrade(
  selected: InventoryItem[],
  balance: number,
): UpgradeValidation {
  if (selected.length !== UPGRADE_COST) {
    return { ok: false, reason: 'count' }
  }

  const rarity = selected[0].rarity
  if (!selected.every((item) => item.rarity === rarity)) {
    return { ok: false, reason: 'mixed' }
  }
  if (!canUpgradeRarity(rarity)) {
    return { ok: false, reason: 'legendary' }
  }

  const targetRarity = nextRarity(rarity)!
  const pool = getUpgradePool(targetRarity)
  if (pool.length === 0) {
    return { ok: false, reason: 'empty_pool' }
  }

  const fee = calcUpgradeFee(selected)
  if (balance < fee) {
    return { ok: false, reason: 'insufficient_funds' }
  }

  return { ok: true, targetRarity, fee, pool }
}

/**
 * Uniform pick inside target rarity (chance forced to 1 for each candidate).
 * Swap this for a weighted catalog roll later if needed.
 */
export function rollUpgradeResult(pool: UpgradeCandidate[]): UpgradeCandidate {
  const uniform = pool.map((item) => ({ ...item, chance: 1 }))
  return pickWeighted(uniform)
}

export function toInventoryItem(
  candidate: UpgradeCandidate,
): InventoryItem {
  return {
    uid: createUid(),
    itemId: candidate.id,
    caseId: candidate.caseId,
    name: candidate.name,
    rarity: candidate.rarity,
    value: candidate.value,
    accent: candidate.accent,
    image: candidate.image,
    obtainedAt: Date.now(),
    source: 'upgrade',
  }
}
