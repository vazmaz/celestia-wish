import { getCaseById } from '../../cases/data/cases'
import { createSeededRng, pickWeighted } from '../../../shared/lib/random'
import type { CaseItem } from '../../../shared/types'
import type {
  BattleMode,
  BattlePlayer,
  BotLuck,
  DropSnapshot,
  RoundDrop,
} from '../types'
import { BattleMode as Mode } from '../types'

/**
 * RoundResolver — pure fair-roll logic for battles.
 *
 * Today: deterministic client RNG from battle seed.
 * v2 swap point: replace `rollItem` body with a server fair-roll API
 * (WebSocket / REST) while keeping this module as the single entry for drops.
 */
function toSnapshot(caseId: string, item: CaseItem): DropSnapshot {
  return {
    itemId: item.id,
    name: item.name,
    rarity: item.rarity,
    value: item.value,
    accent: item.accent,
    caseId,
    image: item.image,
  }
}

/**
 * Demo-only bot luck: hot takes best of 2 rolls, cold takes worst.
 * Local / hotseat always use a single fair roll.
 */
function rollItem(
  caseId: string,
  rng: () => number,
  luck: BotLuck | undefined,
  kind: BattlePlayer['kind'],
): DropSnapshot {
  const caseDef = getCaseById(caseId)
  if (!caseDef) {
    throw new Error(`Unknown case: ${caseId}`)
  }

  const once = () => pickWeighted(caseDef.items, rng)

  if (kind !== 'bot' || !luck || luck === 'neutral') {
    return toSnapshot(caseId, once())
  }

  const a = once()
  const b = once()
  const chosen =
    luck === 'hot'
      ? a.value >= b.value
        ? a
        : b
      : a.value <= b.value
        ? a
        : b
  return toSnapshot(caseId, chosen)
}

export function resolveRoundDrops(params: {
  seed: string
  roundIndex: number
  caseId: string
  players: BattlePlayer[]
  isSuddenDeath: boolean
}): RoundDrop[] {
  const { seed, roundIndex, caseId, players, isSuddenDeath } = params
  const drops: RoundDrop[] = []

  for (const player of players) {
    if (player.forfeited) continue
    // Per-player stream keeps order stable if player list changes mid-dev
    const rng = createSeededRng(`${seed}:r${roundIndex}:p${player.id}`)
    drops.push({
      roundIndex,
      caseId,
      playerId: player.id,
      item: rollItem(caseId, rng, player.luck, player.kind),
      isSuddenDeath,
    })
  }

  return drops
}

export function sumPlayerTotals(
  drops: RoundDrop[],
  players: BattlePlayer[],
): Record<string, number> {
  const totals: Record<string, number> = {}
  for (const p of players) totals[p.id] = 0
  for (const drop of drops) {
    if (players.find((p) => p.id === drop.playerId)?.forfeited) continue
    totals[drop.playerId] = (totals[drop.playerId] ?? 0) + drop.item.value
  }
  for (const p of players) {
    if (p.forfeited) totals[p.id] = 0
  }
  return totals
}

/**
 * Highest mode: max total value wins.
 * Lowest / Points reserved for v2 — fall through to Highest for safety.
 */
export function pickWinnerIds(
  totals: Record<string, number>,
  players: BattlePlayer[],
  mode: BattleMode,
): string[] {
  const active = players.filter((p) => !p.forfeited)
  if (active.length === 0) return []

  if (mode !== Mode.Highest) {
    // Extension point: implement Lowest / Points here later.
  }

  let best = -Infinity
  for (const p of active) {
    best = Math.max(best, totals[p.id] ?? 0)
  }
  return active.filter((p) => (totals[p.id] ?? 0) === best).map((p) => p.id)
}

/**
 * Precompute every main-round drop. Sudden death is resolved later if needed.
 */
export function resolveMainRounds(params: {
  seed: string
  caseIds: string[]
  players: BattlePlayer[]
}): RoundDrop[] {
  const drops: RoundDrop[] = []
  params.caseIds.forEach((caseId, roundIndex) => {
    drops.push(
      ...resolveRoundDrops({
        seed: params.seed,
        roundIndex,
        caseId,
        players: params.players,
        isSuddenDeath: false,
      }),
    )
  })
  return drops
}

export function resolveSuddenDeathRound(params: {
  seed: string
  roundIndex: number
  caseId: string
  players: BattlePlayer[]
}): RoundDrop[] {
  return resolveRoundDrops({ ...params, isSuddenDeath: true })
}
