/**
 * Weighted / seeded RNG helpers.
 * Solo mode uses Math.random; battles use createSeededRng(seed) so rolls are reproducible.
 * v2: replace seeded client rolls with server fair-roll in RoundResolver.
 */

export function createUid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`
}

export function createSeed(): string {
  return `b-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

/** Mulberry32 — fast deterministic PRNG from a string seed. */
export function createSeededRng(seed: string): () => number {
  let t = hashSeed(seed)
  return () => {
    t |= 0
    t = (t + 0x6d2b79f5) | 0
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

function hashSeed(seed: string): number {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/**
 * Weighted random pick. Uses explicit `chance` / weight — not uniform.
 * Pass `rng` for deterministic battle rolls; omit for solo Math.random.
 */
export function pickWeighted<T extends { chance: number }>(
  items: readonly T[],
  rng: () => number = Math.random,
): T {
  if (items.length === 0) {
    throw new Error('pickWeighted: empty list')
  }

  const total = items.reduce((sum, item) => sum + item.chance, 0)
  let roll = rng() * total

  for (const item of items) {
    roll -= item.chance
    if (roll <= 0) {
      return item
    }
  }

  return items[items.length - 1]
}

export function formatChance(chance: number, total: number): string {
  const pct = (chance / total) * 100
  if (pct < 0.1) return '<0.1%'
  if (pct < 1) return `${pct.toFixed(2)}%`
  if (pct < 10) return `${pct.toFixed(1)}%`
  return `${Math.round(pct * 10) / 10}%`
}

export function sumChances(items: readonly { chance: number }[]): number {
  return items.reduce((sum, item) => sum + item.chance, 0)
}
