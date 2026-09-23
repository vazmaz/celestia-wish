import { createUid } from './random.js'
import {
  pickWinningTeamIds,
  pickWinnerIds,
  resolveMainRounds,
  resolveSuddenDeathRound,
  sumPlayerTotals,
  sumTeamTotals,
} from './roundResolver.js'
import type {
  BattlePlayer,
  BotLuck,
  RoundDrop,
  TeamId,
} from './types.js'

const BOT_NAMES = [
  'NovaBot',
  'RiftAI',
  'EmberCPU',
  'FrostBit',
  'PhantomX',
  'SolarDrone',
]

export const SPIN_MS = 4000
export const REVEAL_MS = 2800

export function pickTeamForJoin(
  players: BattlePlayer[],
  teamSize: number,
): TeamId | null {
  if (teamSize <= 1) return null
  const countA = players.filter((p) => p.teamId === 'A').length
  const countB = players.filter((p) => p.teamId === 'B').length
  if (countA >= teamSize && countB >= teamSize) return null
  if (countA <= countB && countA < teamSize) return 'A'
  if (countB < teamSize) return 'B'
  if (countA < teamSize) return 'A'
  return null
}

export function makeBot(
  index: number,
  luck?: BotLuck,
  teamId: TeamId | null = null,
): BattlePlayer {
  const luckRoll: BotLuck =
    luck ?? (['cold', 'neutral', 'hot'] as BotLuck[])[index % 3]
  return {
    id: `bot-${createUid()}`,
    userId: null,
    name: BOT_NAMES[index % BOT_NAMES.length],
    kind: 'bot',
    ready: true,
    forfeited: false,
    luck: luckRoll,
    entryPaid: true,
    teamId,
  }
}

export function makeUserPlayer(
  userId: string,
  username: string,
  teamId: TeamId | null = null,
): BattlePlayer {
  return {
    id: userId,
    userId,
    name: username,
    kind: 'user',
    ready: false,
    forfeited: false,
    entryPaid: false,
    teamId,
  }
}

export function canStart(players: BattlePlayer[], maxPlayers: number): boolean {
  if (players.length < 2) return false
  if (players.length > maxPlayers) return false
  return players.every((p) => p.ready)
}

export function fillWithBots(
  players: BattlePlayer[],
  maxPlayers: number,
  teamSize: number,
): BattlePlayer[] {
  const next = [...players]
  while (next.length < maxPlayers) {
    const teamId = pickTeamForJoin(next, teamSize)
    next.push(makeBot(next.length, undefined, teamId))
  }
  return next
}

export function startDrops(params: {
  seed: string
  caseIds: string[]
  players: BattlePlayer[]
}): { drops: RoundDrop[]; totalRounds: number } {
  const drops = resolveMainRounds(params)
  return { drops, totalRounds: params.caseIds.length }
}

function firstActiveOnTeam(
  players: BattlePlayer[],
  teamId: TeamId,
): string | null {
  return (
    players.find((p) => p.teamId === teamId && !p.forfeited && p.kind === 'user')
      ?.id ??
    players.find((p) => p.teamId === teamId && !p.forfeited)?.id ??
    null
  )
}

export function advanceAfterReveal(state: {
  players: BattlePlayer[]
  drops: RoundDrop[]
  currentRound: number
  totalRounds: number
  suddenDeath: boolean
  caseIds: string[]
  seed: string
  teamSize: number
}):
  | {
      kind: 'next'
      currentRound: number
      totalRounds: number
      suddenDeath: boolean
      drops: RoundDrop[]
    }
  | {
      kind: 'finish'
      winnerId: string | null
      winnerTeamId: TeamId | null
    } {
  const nextRound = state.currentRound + 1
  const isTeam = state.teamSize > 1

  if (nextRound < state.totalRounds) {
    return {
      kind: 'next',
      currentRound: nextRound,
      totalRounds: state.totalRounds,
      suddenDeath: state.suddenDeath,
      drops: state.drops,
    }
  }

  const mainDrops = state.drops.filter((d) => !d.isSuddenDeath)

  if (isTeam) {
    const teamTotals = sumTeamTotals(mainDrops, state.players)
    const leadingTeams = pickWinningTeamIds(teamTotals, state.players)

    if (leadingTeams.length === 1) {
      const teamId = leadingTeams[0]
      return {
        kind: 'finish',
        winnerTeamId: teamId,
        winnerId: firstActiveOnTeam(state.players, teamId),
      }
    }

    if (!state.suddenDeath) {
      const sdCaseId = state.caseIds[state.caseIds.length - 1]
      const sdRoundIndex = state.totalRounds
      const sdPlayers = state.players.filter(
        (p) =>
          !p.forfeited && p.teamId != null && leadingTeams.includes(p.teamId),
      )
      const sdDrops = resolveSuddenDeathRound({
        seed: state.seed,
        roundIndex: sdRoundIndex,
        caseId: sdCaseId,
        players: sdPlayers,
      })
      return {
        kind: 'next',
        currentRound: sdRoundIndex,
        totalRounds: state.totalRounds + 1,
        suddenDeath: true,
        drops: [...state.drops, ...sdDrops],
      }
    }

    const afterTotals = sumTeamTotals(state.drops, state.players)
    const after = pickWinningTeamIds(afterTotals, state.players)
    const teamId = after[0] ?? null
    return {
      kind: 'finish',
      winnerTeamId: teamId,
      winnerId: teamId ? firstActiveOnTeam(state.players, teamId) : null,
    }
  }

  const totals = sumPlayerTotals(mainDrops, state.players)
  const leaders = pickWinnerIds(totals, state.players)

  if (leaders.length === 1) {
    return { kind: 'finish', winnerId: leaders[0], winnerTeamId: null }
  }

  if (!state.suddenDeath) {
    const sdCaseId = state.caseIds[state.caseIds.length - 1]
    const sdRoundIndex = state.totalRounds
    const sdDrops = resolveSuddenDeathRound({
      seed: state.seed,
      roundIndex: sdRoundIndex,
      caseId: sdCaseId,
      players: state.players.filter((p) => leaders.includes(p.id)),
    })
    return {
      kind: 'next',
      currentRound: sdRoundIndex,
      totalRounds: state.totalRounds + 1,
      suddenDeath: true,
      drops: [...state.drops, ...sdDrops],
    }
  }

  const allTotals = sumPlayerTotals(state.drops, state.players)
  const after = pickWinnerIds(allTotals, state.players)
  const winnerId =
    after[0] ??
    state.players.find((p) => !p.forfeited)?.id ??
    state.players[0]?.id ??
    null
  return { kind: 'finish', winnerId, winnerTeamId: null }
}

export function applyForfeit(
  players: BattlePlayer[],
  playerId: string,
  teamSize: number,
): {
  players: BattlePlayer[]
  winnerId: string | null
  winnerTeamId: TeamId | null
  finished: boolean
} {
  const next = players.map((p) =>
    p.id === playerId ? { ...p, forfeited: true, ready: false } : p,
  )

  if (teamSize > 1) {
    const activeTeams = new Set(
      next.filter((p) => !p.forfeited && p.teamId).map((p) => p.teamId!),
    )
    if (activeTeams.size <= 1) {
      const teamId = [...activeTeams][0] ?? null
      return {
        players: next,
        winnerTeamId: teamId,
        winnerId: teamId ? firstActiveOnTeam(next, teamId) : null,
        finished: true,
      }
    }
    return {
      players: next,
      winnerId: null,
      winnerTeamId: null,
      finished: false,
    }
  }

  const active = next.filter((p) => !p.forfeited)
  if (active.length <= 1) {
    return {
      players: next,
      winnerId: active[0]?.id ?? null,
      winnerTeamId: null,
      finished: true,
    }
  }
  return {
    players: next,
    winnerId: null,
    winnerTeamId: null,
    finished: false,
  }
}
