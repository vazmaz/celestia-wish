import { createSeed, createUid } from '../../../shared/lib/random'
import {
  pickWinnerIds,
  resolveMainRounds,
  resolveSuddenDeathRound,
  sumPlayerTotals,
} from './roundResolver'
import {
  BattleMode,
  type BattleConfig,
  type BattlePlayer,
  type BattleRoomState,
  type BotLuck,
  type RoundDrop,
} from '../types'

const BOT_NAMES = [
  'NovaBot',
  'RiftAI',
  'EmberCPU',
  'FrostBit',
  'PhantomX',
  'SolarDrone',
]
const HOTSEAT_NAMES = ['Player 2', 'Player 3', 'Player 4']

export function entryFeeFor(caseIds: string[], casePrice: (id: string) => number): number {
  return caseIds.reduce((sum, id) => sum + casePrice(id), 0)
}

export function createInviteCode(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase()
}

/**
 * BattleRoom — lobby / lifecycle helpers.
 * Designed as plain functions so a future WebSocket layer can call the same API.
 */
export function createRoom(params: {
  hostName: string
  config: BattleConfig
  fillBots?: boolean
}): BattleRoomState {
  const hostId = 'local-you'
  const host: BattlePlayer = {
    id: hostId,
    name: params.hostName,
    kind: 'local',
    ready: true,
    forfeited: false,
    teamId: null,
  }

  const players: BattlePlayer[] = [host]
  if (params.fillBots) {
    while (players.length < params.config.maxPlayers) {
      players.push(makeBot(players.length))
    }
  }

  return {
    id: createUid(),
    inviteCode: createInviteCode(),
    hostId,
    config: {
      ...params.config,
      mode: BattleMode.Highest,
    },
    seed: createSeed(),
    status: 'lobby',
    phase: 'idle',
    players,
    drops: [],
    currentRound: 0,
    totalRounds: params.config.caseIds.length,
    suddenDeath: false,
    winnerId: null,
    createdAt: Date.now(),
    finishedAt: null,
    entryCharged: false,
    payoutDone: false,
  }
}

export function makeBot(index: number, luck?: BotLuck): BattlePlayer {
  const luckRoll: BotLuck =
    luck ?? (['cold', 'neutral', 'hot'] as BotLuck[])[index % 3]
  return {
    id: `bot-${createUid()}`,
    name: `${BOT_NAMES[index % BOT_NAMES.length]}`,
    kind: 'bot',
    ready: true,
    forfeited: false,
    luck: luckRoll,
    teamId: null,
  }
}

export function makeHotseat(index: number): BattlePlayer {
  return {
    id: `hotseat-${createUid()}`,
    name: HOTSEAT_NAMES[Math.min(index, HOTSEAT_NAMES.length - 1)],
    kind: 'hotseat',
    ready: false,
    forfeited: false,
    teamId: null,
  }
}

export function canStart(room: BattleRoomState): boolean {
  if (room.status !== 'lobby') return false
  if (room.players.length < 2) return false
  if (room.players.length > room.config.maxPlayers) return false
  return room.players.every((p) => p.ready)
}

export function startRoom(room: BattleRoomState): BattleRoomState {
  if (!canStart(room)) return room

  const drops = resolveMainRounds({
    seed: room.seed,
    caseIds: room.config.caseIds,
    players: room.players,
  })

  return {
    ...room,
    status: 'running',
    phase: 'spinning',
    drops,
    currentRound: 0,
    totalRounds: room.config.caseIds.length,
    suddenDeath: false,
    winnerId: null,
  }
}

export function forfeitPlayer(room: BattleRoomState, playerId: string): BattleRoomState {
  if (room.status !== 'running') return room
  const players = room.players.map((p) =>
    p.id === playerId ? { ...p, forfeited: true, ready: false } : p,
  )
  const active = players.filter((p) => !p.forfeited)
  if (active.length <= 1) {
    return finishRoom({ ...room, players }, active[0]?.id ?? null)
  }
  return { ...room, players }
}

export function advanceAfterReveal(room: BattleRoomState): BattleRoomState {
  if (room.status !== 'running' || room.phase !== 'revealed') return room

  const nextRound = room.currentRound + 1

  if (nextRound < room.totalRounds) {
    return {
      ...room,
      currentRound: nextRound,
      phase: 'spinning',
    }
  }

  // Main rounds done — check Highest winners
  const mainDrops = room.drops.filter((d) => !d.isSuddenDeath)
  const totals = sumPlayerTotals(mainDrops, room.players)
  const leaders = pickWinnerIds(totals, room.players, room.config.mode)

  if (leaders.length === 1) {
    return finishRoom(room, leaders[0])
  }

  // Sudden death: one extra identical case (last case in the set)
  if (!room.suddenDeath) {
    const sdCaseId = room.config.caseIds[room.config.caseIds.length - 1]
    const sdRoundIndex = room.totalRounds
    const sdDrops = resolveSuddenDeathRound({
      seed: room.seed,
      roundIndex: sdRoundIndex,
      caseId: sdCaseId,
      players: room.players.filter((p) => leaders.includes(p.id)),
    })
    // Non-leaders keep their totals; only leaders roll SD
    return {
      ...room,
      suddenDeath: true,
      drops: [...room.drops, ...sdDrops],
      currentRound: sdRoundIndex,
      totalRounds: room.totalRounds + 1,
      phase: 'spinning',
    }
  }

  // After sudden death — if still tied, pick by seed order (stable)
  const allTotals = sumPlayerTotals(room.drops, room.players)
  const after = pickWinnerIds(allTotals, room.players, room.config.mode)
  const winnerId =
    after[0] ??
    room.players.find((p) => !p.forfeited)?.id ??
    room.players[0].id
  return finishRoom(room, winnerId)
}

export function finishRoom(room: BattleRoomState, winnerId: string | null): BattleRoomState {
  return {
    ...room,
    status: 'finished',
    phase: 'revealed',
    winnerId,
    finishedAt: Date.now(),
  }
}

export function dropsForRound(room: BattleRoomState, roundIndex: number): RoundDrop[] {
  return room.drops.filter((d) => d.roundIndex === roundIndex)
}

export function cloneForRematch(room: BattleRoomState): BattleRoomState {
  return createRoom({
    hostName: room.players.find((p) => p.kind === 'local')?.name ?? 'You',
    config: { ...room.config },
    fillBots: false,
  })
}
