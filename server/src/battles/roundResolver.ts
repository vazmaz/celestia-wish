import { getCaseById, type CatalogItem } from './casesCatalog.js'
import { createSeededRng, pickWeighted } from './random.js'
import type {
  BattlePlayer,
  BotLuck,
  DropSnapshot,
  RoundDrop,
} from './types.js'

function toSnapshot(caseId: string, item: CatalogItem): DropSnapshot {
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

export function pickWinnerIds(
  totals: Record<string, number>,
  players: BattlePlayer[],
): string[] {
  const active = players.filter((p) => !p.forfeited)
  if (active.length === 0) return []

  let best = -Infinity
  for (const p of active) {
    best = Math.max(best, totals[p.id] ?? 0)
  }
  return active.filter((p) => (totals[p.id] ?? 0) === best).map((p) => p.id)
}

export function sumTeamTotals(
  drops: RoundDrop[],
  players: BattlePlayer[],
): Record<string, number> {
  const playerTotals = sumPlayerTotals(drops, players)
  const teams: Record<string, number> = { A: 0, B: 0 }
  for (const p of players) {
    if (!p.teamId || p.forfeited) continue
    teams[p.teamId] = (teams[p.teamId] ?? 0) + (playerTotals[p.id] ?? 0)
  }
  return teams
}

export function pickWinningTeamIds(
  teamTotals: Record<string, number>,
  players: BattlePlayer[],
): Array<'A' | 'B'> {
  const activeTeams = new Set(
    players.filter((p) => !p.forfeited && p.teamId).map((p) => p.teamId!),
  )
  if (activeTeams.size === 0) return []

  let best = -Infinity
  for (const t of activeTeams) {
    best = Math.max(best, teamTotals[t] ?? 0)
  }
  return [...activeTeams].filter((t) => (teamTotals[t] ?? 0) === best)
}

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
