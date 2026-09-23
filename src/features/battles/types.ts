import type { Rarity } from '../../shared/types'

export const BattleMode = {
  Highest: 'highest',
  Lowest: 'lowest',
  Points: 'points',
} as const

export type BattleMode = (typeof BattleMode)[keyof typeof BattleMode]

export type BattlePrivacy = 'public' | 'private'
export type BattleStatus = 'lobby' | 'running' | 'finished' | 'cancelled'
export type BattlePhase = 'idle' | 'spinning' | 'revealed'
export type PlayerKind = 'user' | 'bot'
export type BotLuck = 'cold' | 'neutral' | 'hot'
export type TeamId = 'A' | 'B'
export type BattleFormat = 'ffa2' | 'ffa3' | 'ffa4' | '2v2' | '3v3'

export interface BattlePlayer {
  id: string
  userId: string | null
  name: string
  kind: PlayerKind
  ready: boolean
  forfeited: boolean
  luck?: BotLuck
  entryPaid: boolean
  teamId: TeamId | null
}

export interface DropSnapshot {
  itemId: string
  name: string
  rarity: Rarity
  value: number
  accent: string
  caseId: string
  image: string
}

export interface RoundDrop {
  roundIndex: number
  caseId: string
  playerId: string
  item: DropSnapshot
  isSuddenDeath: boolean
}

export interface BattleRoomState {
  id: string
  inviteCode: string
  hostUserId: string
  privacy: BattlePrivacy
  status: BattleStatus
  phase: BattlePhase
  maxPlayers: number
  teamSize: number
  caseIds: string[]
  mode: string
  fillBots: boolean
  seed: string
  players: BattlePlayer[]
  drops: RoundDrop[]
  currentRound: number
  totalRounds: number
  suddenDeath: boolean
  winnerId: string | null
  winnerTeamId: TeamId | null
  entryFee: number
  phaseStartedAt: number | null
  finishedAt: number | null
  payoutDone: boolean
  createdAt: number
  updatedAt: number
  phaseEndsInMs: number | null
}

export function formatLabel(room: {
  teamSize?: number
  maxPlayers: number
}): string {
  const teamSize = room.teamSize ?? 1
  if (teamSize === 3) return '3v3'
  if (teamSize === 2) return '2v2'
  if (room.maxPlayers === 2) return '1v1'
  if (room.maxPlayers === 3) return '1v1v1'
  if (room.maxPlayers === 4) return '1v1v1v1'
  return `${room.maxPlayers}p`
}
