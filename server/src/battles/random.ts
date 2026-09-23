export function createUid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`
}

export function createSeed(): string {
  return `b-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export function createInviteCode(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase()
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
