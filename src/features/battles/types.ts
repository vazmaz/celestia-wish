import type { Rarity } from '../../shared/types'

/** Victory modes — only Highest is implemented in MVP. */
export const BattleMode = {
  Highest: 'highest',
  Lowest: 'lowest',
  Points: 'points',
} as const

export type BattleMode = (typeof BattleMode)[keyof typeof BattleMode]

export type BattlePrivacy = 'public' | 'private'
export type BattleStatus = 'lobby' | 'running' | 'finished' | 'cancelled'
export type BattlePhase = 'idle' | 'spinning' | 'revealed'
export type PlayerKind = 'local' | 'bot' | 'hotseat'
export type BotLuck = 'cold' | 'neutral' | 'hot'

export interface BattlePlayer {
  id: string
  name: string
  kind: PlayerKind
  ready: boolean
  forfeited: boolean
  /** Demo-only bot bias; local/hotseat always fair. */
  luck?: BotLuck
  /** Reserved for future team modes (2v2). */
  teamId?: string | null
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

export interface BattleConfig {
  maxPlayers: 2 | 3 | 4
  caseIds: string[]
  privacy: BattlePrivacy
  mode: BattleMode
}

export interface BattleRoomState {
  id: string
  inviteCode: string
  hostId: string
  config: BattleConfig
  seed: string
  status: BattleStatus
  phase: BattlePhase
  players: BattlePlayer[]
  /** Precomputed fair rolls for the whole match (incl. sudden death if needed). */
  drops: RoundDrop[]
  currentRound: number
  totalRounds: number
  suddenDeath: boolean
  winnerId: string | null
  createdAt: number
  finishedAt: number | null
  /** True after local entry fee charged. */
  entryCharged: boolean
  /** True after winner received pool items. */
  payoutDone: boolean
}

export interface BattleHistoryEntry {
  id: string
  finishedAt: number
  mode: BattleMode
  caseIds: string[]
  players: { id: string; name: string; kind: PlayerKind; total: number }[]
  winnerId: string
  winnerName: string
  youWon: boolean
  poolValue: number
  entryFee: number
}
