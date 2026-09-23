export type BotLuck = 'cold' | 'neutral' | 'hot'
export type PlayerKind = 'user' | 'bot'
export type BattlePrivacy = 'public' | 'private'
export type BattleStatus = 'lobby' | 'running' | 'finished' | 'cancelled'
export type BattlePhase = 'idle' | 'spinning' | 'revealed'
export type TeamId = 'A' | 'B'

export type DropSnapshot = {
  itemId: string
  name: string
  rarity: string
  value: number
  accent: string
  caseId: string
  image: string
}

export type RoundDrop = {
  roundIndex: number
  caseId: string
  playerId: string
  item: DropSnapshot
  isSuddenDeath: boolean
}

export type BattlePlayer = {
  id: string
  userId: string | null
  name: string
  kind: PlayerKind
  ready: boolean
  forfeited: boolean
  luck?: BotLuck
  entryPaid: boolean
  /** null in free-for-all */
  teamId: TeamId | null
}

export type PublicBattleRoom = {
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
  /** ms until next auto phase flip (running only). */
  phaseEndsInMs: number | null
}

export type BattleFormat = 'ffa2' | 'ffa3' | 'ffa4' | '2v2' | '3v3'

export function formatConfig(format: BattleFormat): {
  maxPlayers: number
  teamSize: number
  label: string
} {
  switch (format) {
    case 'ffa2':
      return { maxPlayers: 2, teamSize: 1, label: '1v1' }
    case 'ffa3':
      return { maxPlayers: 3, teamSize: 1, label: '1v1v1' }
    case 'ffa4':
      return { maxPlayers: 4, teamSize: 1, label: '1v1v1v1' }
    case '2v2':
      return { maxPlayers: 4, teamSize: 2, label: '2v2' }
    case '3v3':
      return { maxPlayers: 6, teamSize: 3, label: '3v3' }
  }
}
